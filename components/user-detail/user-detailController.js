'use strict';

cs142App.controller('UserDetailController', ['$scope', '$resource', '$rootScope', '$routeParams', '$location',
    function($scope, $resource, $rootScope, $routeParams, $location) {
        /*
         * Since the route is specified as '/users/:userId' in $routeProvider config the
         * $routeParams  should have the userId property set with the path from the URL.
         */

        var userId = $routeParams.userId;
        $scope.currUser =  $rootScope.user._id;
        $scope.userMatches = userId === $scope.currUser;
        // delete current user, set log in status to be false, redirect to log in page
        $scope.deleteAccount = function() {
            var isSure = confirm("Are you sure you want to delete your account permanently?");
            if (!isSure) {
                return;
            }
            var resource = $resource("/delete/" + $scope.currUser);
            resource.save(function() {
                $rootScope.user = null;
                $rootScope.isLoggedIn = false;
                $location.path("/login-register");
            })
        }

        var User = $resource("/user/:_id", {
            _id: userId
        });
        var data = User.get({}, function() {
            $scope.user = data;
            $scope.name = data.first_name + " " + data.last_name;

        });
    }
]);
