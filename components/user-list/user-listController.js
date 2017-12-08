'use strict';

cs142App.controller('UserListController', ['$scope', '$resource', '$rootScope', '$routeParams',
    function($scope, $resource, $rootScope, $routeParams) {
        



        var UserList= $resource("/user/list");
        UserList.query({}, function(data){
                $scope.userList = data;
        });



    }]);
