'use strict';

cs142App.controller('UserPhotosController', ['$scope', '$resource', '$rootScope', '$routeParams',
    function($scope, $resource, $rootScope, $routeParams) {
        /*
         * Since the route is specified as '/photos/:userId' in $routeProvider config the
         * $routeParams  should have the userId property set with the path from the URL.
         */
        var userId = $routeParams.userId;
        $scope.currUser =  $rootScope.user._id;


        $scope.FetchModel('/user/' + userId, function(data1) {
            $scope.$apply(function() {
                $scope.user = data1;
                $scope.userName = data1.first_name + ' ' + data1.last_name;
            });
        });

        $scope.FetchModel('/photosOfUser/' + userId, function(data2) {
            $scope.$apply(function () {
                $scope.photoList = data2;
                for (var p = 0; p < $scope.photoList.length; p++) {
                    if (!$scope.photoList[p].numLikes) {
                        $scope.photoList[p].numLikes = 0;
                    }
                }
            });
        });

        // adds currently logged in user to the likes list of photo, and reset photo view
        $scope.like = function() {
            var resource = $resource('/like/' + $scope.photo._id);
            resource.save({}, function() {
                $rootScope.$broadcast('renderPhotos');
            });
        };

        // check if photo is uploaded by current logged in user
        $scope.photoUserMatches = function(photo) {
            return $scope.currUser === photo.user_id;
        };

        $scope.deletePhoto = function(photo) {
            var resource = $resource('/deletePhoto/' + photo._id);
            resource.save({}, function() {
                $rootScope.$broadcast('renderPhotos');
            });
        };

        // check if comment is written by current logged in user
        $scope.commentUserMatches = function(comment) {
            return $scope.currUser === comment.user._id;
        };

        // user delect own comment
        $scope.deleteComment = function(photo, comment) {
            var resource = $resource('/deleteComment/' + photo._id);
            resource.save({comment_index: photo.comments.indexOf(comment)}, function() {
                $rootScope.$broadcast('renderPhotos');
            });
        };

        // user submits comment
        $scope.addComment = function() {
            var resource = $resource('/commentsOfPhoto/' + $scope.photo._id);
            console.log("resource for comment found! photoId: ", $scope.photo._id);
            resource.save({
                comment: $scope.newComment
            }, function() {
                $rootScope.$broadcast('renderPhotos');
            });
        };

        // update photo view on signal
        $scope.$on('renderPhotos', function() {
            $scope.FetchModel('/photosOfUser/' + userId, function(data3) {
                $scope.$apply(function() {
                    $scope.photoList = data3;
                });
            });
        });
    }
]);
