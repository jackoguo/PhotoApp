'use strict';

var cs142App = angular.module('cs142App', ['ngRoute', 'ngMaterial', 'ngResource']);

cs142App.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when('/users', {
            templateUrl: 'components/user-list/user-listTemplate.html',
            controller: 'UserListController'
        }).
        when('/users/:userId', {
            templateUrl: 'components/user-detail/user-detailTemplate.html',
            controller: 'UserDetailController'
        }).
        when('/photos/:userId', {
            templateUrl: 'components/user-photos/user-photosTemplate.html',
            controller: 'UserPhotosController'
        }).
        when('/login-register', {
            templateUrl: 'components/login-register/login-registerTemplate.html',
            controller: 'LoginRegisterController'
        }).
        otherwise({
            redirectTo: '/users'
        });
    }
]);

cs142App.controller('MainController', ['$scope', '$rootScope', '$location','$resource', '$http',
    function($scope, $rootScope, $location, $resource, $http) {

        $scope.logout = function() {
            var resource = $resource('/admin/logout');
            resource.get({}, function() {
                $rootScope.user = null;
                $rootScope.isLoggedIn = false;
                $location.path("/login-register");
            });
        };


        $scope.main = {};
        $scope.main.title = 'CS142 Project';

        // get model data
        $scope.FetchModel = function(url, doneCallback) {
            var httpRequest = new XMLHttpRequest();
            httpRequest.onreadystatechange = function() {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        if (doneCallback) {
                            doneCallback(JSON.parse(this.responseText));
                        }
                    }
                }
            };
            httpRequest.open('GET', url);
            httpRequest.send();
        };

        // for the first time log in, if no log in info is provided, default to false
        if ($rootScope.isLoggedIn === undefined) {
            $rootScope.isLoggedIn = false;
        }

        // if not logged in, always redirect page to log in page
        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            if (!$rootScope.isLoggedIn) {
                if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                    $location.path("/login-register");
                }
            }
        });

        var selectedPhotoFile; // Holds the last file selected by the user

        // Called on file selection - we simply save a reference to the file in selectedPhotoFile
        $scope.inputFileNameChanged = function(element) {
            selectedPhotoFile = element.files[0];
        };

        // Has the user selected a file?
        $scope.inputFileNameSelected = function() {
            return !!selectedPhotoFile;
        };
        // Upload the photo file selected by the user using a post request to the URL /photos/new
        $scope.uploadPhoto = function() {

            if (!$scope.inputFileNameSelected()) {
                console.error("uploadPhoto called will no selected file");
                return;
            }

            var isRestricted = confirm("Do you want to specify a list of accessible users? Ok to specify or Cancel to not specify.");
            var names = [];

            if (isRestricted === true) {
                var visibleName = prompt("Enter a list of names of users that can see this photo, separated by comma (,). If you don't enter a name, only you are accessible. ");
                if (visibleName) {
                    var namesRaw = visibleName.split(",");
                    for (var n = 0; n < namesRaw.length; n++) {
                        names.push(namesRaw[n].trim());
                }

            }
        }

            // Create a DOM form and add the file to it under the name uploadedphoto
            var domForm = new FormData();
            domForm.append('uploadedphoto', selectedPhotoFile);
            domForm.append('isRestricted', isRestricted);
            domForm.append('visibleNames', names);

            // Using $http to POST the form
            $http.post('/photos/new', domForm, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            }).then(function successCallback(response) {
                // The photo was successfully uploaded.
                $location.path("/photos/" + $rootScope.user._id);
                $rootScope.$broadcast('render');
            }, function errorCallback(response) {
                alert("There is an error!");
                console.error('ERROR uploading photo', response);
            });
        };
    }
]);
