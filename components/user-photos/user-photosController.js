'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$resource', '$rootScope', '$routeParams',
    function($scope, $resource, $rootScope, $routeParams) {
        /*
         * Since the route is specified as '/photos/:userId' in $routeProvider config the
         * $routeParams  should have the userId property set with the path from the URL.
         */
        var userId = $routeParams.userId;

        console.log("in userphoto controller, userID: ", userId);

        $scope.FetchModel('/user/' + userId, function(data1) {
            $scope.$apply(function() {
                $scope.user = data1;
                $scope.userName = data1.first_name + ' ' + data1.last_name;
            });
        });

        $scope.FetchModel('/photosOfUser/' + userId, function(data2) {
            $scope.$apply(function () {
                $scope.photoList = data2;
            });
        });

        // var User = $resource("/user/:id");
        // User.get({
        //     _id: userId
        // }, function(data1) {
        //     $scope.user = data1;
        //
        //     $scope.userName = data1.first_name + ' ' + data1.last_name;
        //     console.log("in userphoto, get user, user name: ", $scope.userName)
        // });
        //
        //
        // var UserPhoto = $resource("/photosOfUser/:id");
        // UserPhoto.query({
        //     user_id: userId
        // }, function(data2) {
        //     $scope.photoList = data2;
        //     console.log("in userphoto, get user photo");
        // });

        $scope.addComment = function() {

            var resource = $resource('/commentsOfPhoto/' + $scope.photo._id);
            console.log("resource for comment found! photoId: ", $scope.photo._id);
            resource.save({
                comment: $scope.newComment
            }, function() {
                console.log("comment saved, broadcasting to render photos again")
                $rootScope.$broadcast('renderPhotos');
            });
        }
        $scope.$on('renderPhotos', function() {
            $scope.FetchModel('/photosOfUser/' + userId, function(data3) {
                $scope.$apply(function() {
                    $scope.photoList = data3;
                });
            });
        });
    }
]);
