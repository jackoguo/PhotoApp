'use strict';

cs142App.controller('UserDetailController', ['$scope', '$resource', '$rootScope', '$routeParams',
    function($scope, $resource, $rootScope, $routeParams) {
        /*
         * Since the route is specified as '/users/:userId' in $routeProvider config the
         * $routeParams  should have the userId property set with the path from the URL.
         */
        var userId = $routeParams.userId;
        console.log("in user detail controller, userID: ", userId);
        var User = $resource("/user/:_id", {
            _id: userId
        });
        var data = User.get({}, function() {
            $scope.user = data;
            $scope.name = data.first_name + " " + data.last_name;

        });
    }
]);
