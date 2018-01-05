'use strict';

cs142App.controller('LoginRegisterController', ['$scope', '$routeParams', '$resource', '$rootScope', '$location',
    function($scope, $routeParams, $resource, $rootScope, $location) {
        // log in
        $scope.login = function() {
            var resource = $resource('/admin/login');
            resource.save({
                login_name: $scope.username,
                password: $scope.pw
            }, function(userObj) {
                console.log('userObj: ', userObj);
                $rootScope.user = userObj;
                // set logged in flag to be true, redirect to user detail page
                $rootScope.isLoggedIn = true;
                console.log($rootScope.isLoggedIn);
                $location.path('/users/' + userObj._id);
            }, function(err) {
                if (err.data === "wrong") {
                    alert("Invalid username or password!");
                } else if (err.data === "error-other") {
                    alert("There is an error!");
                }
            });
        }

        // register new user, get details from user input
        $scope.register = function() {
            var resource = $resource('/user');
            resource.save({
                login_name: $scope.username_reg,
                password: $scope.pw_reg,
                first_name: $scope.first_name,
                last_name: $scope.last_name,
                occupation: $scope.occupation,
                location: $scope.location,
                description: $scope.description
            }, function(userObj) {
                console.log("in register function now");
                $rootScope.user = userObj;
                // set logged in flag to be true, and redirect to user detail page
                $rootScope.isLoggedIn = true;
                $rootScope.$broadcast('login');
                $location.path('/users/' + userObj._id);
            }, function(err) {
                if (err.data === "missing-item") {
                    alert("Username, password and name are required.")
                } else if (err.data === "same-username") {
                    alert("User name already used. Please choose another one.")
                } else if (err.data === "error-other-reg") {
                    alert("There is an error!");
                }
            });
        }
}]);
