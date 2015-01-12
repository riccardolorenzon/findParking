// js functions
// returns one random color, used for a specific driver's marker
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

// random location
function getRandomLocations(northeastpoint, southwestpoint, center){
      var lat_min = 0; lat_min = southwestpoint.latitude;
      var lat_range = 0;  lat_range = northeastpoint.latitude - lat_min;
      var lng_min = 0; lng_min = southwestpoint.longitude;
      var lng_range = 0; lng_range = northeastpoint.longitude - lng_min;
      var final_lat = lat_min + (Math.random() * lat_range);
      var final_lng = lng_min + (Math.random() * lng_range);
  places =
      ['Via+Tortona,+20144+Milano',
       'Via+Galeazzo+Alessi,+20123+Milano',
       'Corso+Monforte,+Milano',
       'Via+Paolo+Sarpi,+Milano',
       'Via+Felice+Casati,+Milano',
       'Via+Bergamo,+Milano'
  ];
  index1 = Math.floor(Math.random() * 6);
  st = places[index1];
  places.splice(index1, 1);
  index2 = Math.floor(Math.random() * 5);
  en = places[index2];

  return [st,en];
}

isEmpty = function(obj) {
        for (var prop in obj) if (this.hasOwnProperty(obj)) return false;
        return true;
    };


var findparkApp = angular.module('findPark', ['uiGmapgoogle-maps']);

findparkApp.config(function(uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        //    key: 'your api key',
        v: '3.17',
        libraries: 'weather,geometry,visualization'
    });
});

findparkApp.controller('mapCtrl', function ( $scope, $http, $log, $interval, $timeout, uiGmapGoogleMapApi) {
    uiGmapGoogleMapApi.then(function (maps) {
    $scope.map = {
        center: {latitude: 45.4627338, longitude: 9.1777322 },
        zoom: 12,
        bounds: {northeast: {latitude: 45.5237590, longitude: 9.2087530}, southwest: {latitude: 45.4217120, longitude: 9.1067110}},
        events: {
            bounds_changed :
                function(e){
                    //alert(e.bounds.northeast.latitude);
                    //alert($scope.map.bounds);
                    //TODO: trigger new drivers creations based on new bounds
                }
        }
    };

    // given bounds and center i need to find random points between the fist and the third quarter of the cartesian plane
    // lat [+90, -90] longitude [+180, -180]
    // Average point between 2 points, formula based on Talete theorem
    var firtsQuarterPointX = $scope.map.bounds.northeast.longitude + $scope.map.center.longitude / 2;
    var firtsQuarterPointY = $scope.map.bounds.northeast.latitude + $scope.map.center.latitude / 2;
    var thirdQuarterPointX = $scope.map.bounds.southwest.longitude + $scope.map.center.longitude / 2;
    var thirdQuarterPointY = $scope.map.bounds.southwest.latitude + $scope.map.center.latitude / 2;

    $scope.paths = [];
    var obj = {};
    $scope.drivers = [];
    $scope.drivers_details = [];
    var num_drivers = 2;
    var driver_obj = {};

    for (i = 0; i < num_drivers; i++)
    {
        var details = {};
        details.json = {};
        details.step = 0;
        details.latestChange = new Date();
        var point = {'latitude': -90 + 180 * Math.random(), 'longitude': -180 + 360 * Math.random()};
        points = getRandomLocations($scope.map.bounds.northeast, $scope.map.bounds.southwest, $scope.map.center);
        details.start = points[0];
        details.end = points[1];
        //console.log(points[0] + " " + points[1]);
        $scope.drivers_details.push(details);
        var obj = {
            id: 0,
            coords: {
                latitude: 45.4627338,
                longitude: 9.1777322
            },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8.5,
                fillColor: getRandomColor(),
                fillOpacity: 1,
                strokeWeight: 0.4
            },
            options: {
                draggable: false,
                labelAnchor: "100 0",
                labelClass: "marker-labels"
            }
        }
        $scope.drivers.push(obj);
    }

     for (i = 0; i < num_drivers; i++) {
        driver = $scope.drivers[i];
        $scope.$watch('$scope.drivers[i].coords', function (newValue, oldValue, scope) {
            currentTime = new Date();
            if (typeof $scope.drivers_details[i] == "undefined")
                return;
            if (currentTime - $scope.drivers_details[i].latestChange > stopTimeout) {
                // i-th driver parked
                console.log("driver number " + i + ": parked");
                $http.post('/api/parkingspots/', {status: 'open',
                    'latitude': driver.coords.latitude,
                    'longitude': driver.coords.longitude, 'area': null })
                    .success(function (data, status) {

                    })
                    .error(function (data, status, headers, config) {
                        $scope.restData = "error on sending data to the server: " + status;
                    });
                $scope.driver_details[i].latestChange = currentTime;
            }
        }, true);
    }

    function fnsuccess(driver_details, driver, index) {
        console.log("fnsuccess");
        var jsonObj = driver_details.json;
        var step = driver_details.step;
        if (typeof jsonObj.routes == "undefined") {
            step = 0;
            return;
        }
        var stepObj = jsonObj.routes[0].legs[0].steps[step];
        if (typeof stepObj != "undefined") {
            end_location = {};
            end_location.latitude = stepObj.end_location.lat;
            end_location.longitude = stepObj.end_location.lng;
            driver.coords.latitude = end_location.latitude;
            driver.coords.longitude = end_location.longitude;
        }
        if (step % 4 == 0) {
            // wait a longer period to the next iteration
            $timeout(function () {
                $scope.simulation(index);
            }, Math.floor((Math.random() * WaitingTimeMax) + 1) * 10);
        }
        else {
            $timeout(function () {
                $scope.simulation(index);
            }, Math.floor((Math.random() * WaitingTimeMax) + 1));
        }
    };

    checkStep = function (jsonObj, step) {
        if (typeof  jsonObj.routes == "undefined")
            return 0;

        if (typeof  jsonObj.routes[0] == "undefined")
            return 0;

        if (typeof  jsonObj.routes[0].legs == "undefined")
            return 0;

        if (step == jsonObj.routes[0].legs[0].steps.length - 1) {
            return 0;
        }
        return step;
    };


    $scope.simulation = function (index) {
        driver = $scope.drivers[index];
        driver_details = $scope.drivers_details[index];
        $scope.drivers_details[index].step = checkStep(driver_details.json, driver_details.step);

        console.log("starting simulation for driver : " + index + " step " + $scope.drivers_details[index].step);
        if (isEmpty(driver_details.json)) {
            $http.get('/proxy/gmapsdirections/' + driver_details.start + '/' + driver_details.end + '/')
                .success(function (data, status) {
                    driver_details.json = JSON.parse(JSON.stringify(data));
                    //if (driver_details.json.status != "ZERO_RESULTS" && typeof driver_details.json.routes[0] != "undefined" )
                    if (driver_details.json.status != "ZERO_RESULTS" && typeof driver_details.json.routes[0] != "undefined" )
                    {

                        fnsuccess(driver_details, driver, index);
                    }
                    else{
                        //console.log('/proxy/gmapsdirections/' + driver_details.start + '/' + driver_details.end + '/' + "no routes!");
                    }
                })
                .error(function (data, status, headers, config) {
                    $scope.restData = "errore nel ricevimento dati json ";
                });
        }
        else {
            console.log(driver_details.json);
            console.log($scope.drivers_details[index].step);
            fnsuccess(driver_details, driver, index);
        }
        $scope.drivers_details[index].step += 1;
        console.log("end simulation for driver : " + index);
    };

    var WaitingTimeMax = 100;
    var stopTimeout = 100;

    for (i = 0; i< num_drivers; i++)
    {
        driver = $scope.drivers[i];
        driver_details = $scope.drivers_details[i];
        $scope.simulation(i);
    }
    });
  });