'use strict';

cs142App.controller('UserListController', ['$scope', '$resource', '$rootScope', '$routeParams',
    function($scope, $resource, $rootScope, $routeParams) {
        $scope.main.title = 'Users';



        var UserList= $resource("/user/list");
        UserList.query({}, function(data){
                $scope.userList = data;
        });



    }]);
