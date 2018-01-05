"use strict";

var env = 'dev'; // ['dev', 'prod']

var mongoose = require('mongoose');
var mongodb = require('mongodb');
var async = require('async');
var session = (env === 'dev') ? require('express-session') : require('cookie-session');
var bodyParser = require('body-parser');
var fs = require("fs");
var multer = require('multer');
var processFormBody = multer({
    storage: multer.memoryStorage()
}).single('uploadedphoto');

// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var express = require('express');
var app = express();

// database connection
var db_url = process.env.DATABASE_URL ? process.env.DATABASE_URL : 'mongodb://localhost/cs142project6';
mongoose.connect(db_url, {useMongoClient: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// static module
app.use(express.static(__dirname));

// session management
var session_options = (env === 'dev') ? {secret: 'secretKey', resave: false, saveUninitialized: false} : {name: 'sessionName', secret: 'secretKey'};
app.use(session(session_options));

app.use(bodyParser.json());

app.get('/', function(request, response) {
    response.send('Simple web server of files from ' + __dirname);
});


/*
 * URL /user/list - Return all the User object.
 */
app.get('/user/list', function(request, response) {

    var result = [];
    User.find(function(err, users) {
        if (err !== null) {
            console.error("Error.");
            response.status(500).send(JSON.stringify(err));
            return;
        }

        for (var u = 0; u < users.length; u++) {
            var user = users[u];
            var userObj = {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name
            };
            result.push(userObj);
        }
        response.status(200).send(result);
    });

});
/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function(request, response) {

    var id = request.params.id;
    User.findOne({
        _id: id
    }, function(err, user) {
        if (err) {
            console.error("in User info page - User not found.");
            response.status(400).send("Invalid User ID");
            return;
        }
        if (user === undefined) {
            response.status(400).send("Invalid User ID")
        }
        var userObj = {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            description: user.description,
            location: user.location,
            occupation: user.occupation
        }

        response.status(200).send(userObj);
    });

});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */
app.get('/photosOfUser/:id', function(request, response) {
    var id = request.params.id;

    Photo.find({
        'user_id': id
    }, function(err, photos) {
        if (err != null) {
            response.status(400).send(JSON.stringify(err));
            return;
        }
        // filter photos according to users' visibility settings, if current user is not registered as visible, then photo is not displayed
        photos = photos.filter(function(p) {

            if (p.isRestricted === false) {
                return true;
            } else if (id === request.session.user._id) {
                return true;
            } else if (p.visibleNames.indexOf(request.session.user.first_name + ' ' + request.session.user.last_name) >= 0) {
                return true;
            }
            return false;
        });

        // loop through each photo and then comments, get comment author
        var photoCopy = JSON.parse(JSON.stringify(photos));
        async.each(photoCopy, function(photo, callbackPhotos) {

            async.each(photo.comments, function(comment, callbackComments) {
                User.findOne({
                    '_id': comment.user_id
                }, function(err, user) {
                    if (err !== null) {
                        console.error("Error");
                        response.status(400).send(JSON.stringify(err));
                        return;
                    } else if (user === null) {
                        console.error("In photosOfUser - User not found.");
                        response.status(400).send(JSON.stringify(err));
                        return;
                    }
                    comment.user = user;
                    callbackComments(err);
                });
            }, function(err) {
                if (err) {
                    console.error("Error");
                } else {
                    callbackPhotos(err);
                }
            });
        }, function(err) {
            if (err) {
                console.error("Error");
                response.status(400).send(JSON.stringify(err));
                return;
            } else {
                // send photoCopy (a copy of all photos)
                response.status(200).send(photoCopy);
            }
        });
    });
});



// login function
app.post('/admin/login', function(request, response) {
    var username = request.body.login_name;
    var password = request.body.password;

    User.findOne({
        login_name: username
    }, function(err, user) {
        if (!user || password !== user.password) {
            response.status(400).send("wrong");
        } else if (err) {
            response.status(400).send("error-other");
        } else {
            request.session.user = user;
            response.status(200).send(user);

        }
    });
});

// register new user
app.post('/user', function(request, response) {
    if (request.body.login_name === false || request.body.password === false || request.body.first_name === false || request.body.last_name === false) {
        response.status(400).send("missing-item");
        return;
    }

    User.findOne({
        login_name: request.body.login_name
    }, function(err, user) {
        if (err) {
            response.status(400).send("error-other-reg");
            return;
        } else if (user) {
            response.status(400).send("same-username");
            return;
        }

        User.create({
            login_name: request.body.login_name,
            password: request.body.password,
            first_name: request.body.first_name,
            last_name: request.body.last_name,
            location: request.body.location,
            occupation: request.body.occupation,
            description: request.body.description
        }, function(err, user) {
            if (err) {
                response.status(400).send("error-other-reg");
                return;
            }
            user.save();
            request.session.user = user;
            response.status(200).send(user);
        })
    })
});

// logout
app.get('/admin/logout', function(request, response) {
    request.session.destroy(function(err) {
        if (err) {
            response.status(401).send();
            return;
        }
        response.status(200).send();
        return;
    });
});

// get comments of photo
app.post('/commentsOfPhoto/:photo_id', function(request, response) {


    var photoId = request.params.photo_id;
    Photo.findOne({
        _id: photoId
    }, function(err, photo) {
        if (err) {
            response.status(401).send("photo-error");
            return;
        } else if (photo === null) {
            response.status(401).send('photo-id-error');
        } else {

            photo.comments.push({
                comment: request.body.comment,
                user_id: request.session.user._id
            });
            photo.save();
            response.status(200).send();
        }
    });

});

// upload new photo
app.post('/photos/new', function(request, response) {

    processFormBody(request, response, function(err) {
        if (err || !request.file) {
            response.status(400).send("File Upload Error");
            return;
        }
        // request.file has the following properties of interest
        //      fieldname      - Should be 'uploadedphoto' since that is what we sent
        //      originalname:  - The name of the file the user uploaded
        //      mimetype:      - The mimetype of the image (e.g. 'image/jpeg',  'image/png')
        //      buffer:        - A node Buffer containing the contents of the file
        //      size:          - The size of the file in bytess

        // TODO: change from writing into local -> S3 storage
        var timestamp = new Date().valueOf();
        var filename = 'U' + String(timestamp) + request.file.originalname;
        fs.writeFile("./images/" + filename, request.file.buffer, function(err) {
            // XXX - Once you have the file written into your images directory under the name
            // filename you can create the Photo object in the database
            if (err !== null) {
                response.status(400).send("file-error");
                return;
            }
            var defaultNumLikes = 0;
            Photo.create({
                file_name: filename,
                user_id: request.session.user._id,
                visibleNames: request.body.visibleNames.split(","),
                isRestricted: request.body.isRestricted,
                numLikes: defaultNumLikes
            }, function(err, photo) {
                if (err !== null) {
                    response.status(400).send("error-other-photo");
                    return;
                }
                photo.save();
                response.status(200).send(photo);
            })
        });
    });
});

// user likes a photo
app.post('/like/:photo_id', function(request, response) {
    var photoId = request.params.photo_id;
    Photo.findOne({
        _id: photoId
    }, function(err, photo) {
        if (err) {
            console.error("Error liking photo");
            reponse.status(401).send("error-like");
            return
        } else if (photo === null) {
            console.error("Can't find photo");
            reponse.status(401).send("error-like-invalid-photo");
        } else {
            // photo has a schema that keeps track of users who like the photo. This is updated with each like
            var userId = request.session.user._id;
            var userIndex = photo.likes.indexOf(userId);
            if (userIndex < 0) {
                photo.likes.push(userId);
                photo.numLikes = photo.likes.length;
            } else {
                photo.likes.splice(userIndex, 1);
                photo.numLikes = photo.likes.length;
            }
            photo.save();
            response.status(200).send("Like/Unlike succuessful");
        }
    });
});

// delete a photo by the owner
app.post('/deletePhoto/:photo_id', function(request, response) {


    var photoId = request.params.photo_id;
    Photo.findOne({
        _id: photoId
    }, function(err, photo) {
        if (err) {
            console.error('cannot find photo:', err);
            response.status(401).send("photo error");
            return;
        } else if (!photo) {
            console.error('no such photo');
            response.status(401).send('no such photo');
        }
        // remove the photo of given id
        else {
            Photo.remove({
                _id: photoId
            }, function(err) {
                if (err) {
                    response.status(401).send("delete photo error");
                    return;
                }
                response.status(200).send();
            });
        }
    });

});
// delete a comment
app.post('/deleteComment/:photo_id', function(request, response) {


    var photoId = request.params.photo_id;
    var comment_index = request.body.comment_index;




    Photo.findOne({
        _id: photoId
    }, function(err, photo) {
        if (err) {
            console.error('cannot find that photo', err);
            response.status(401).send("photo error");
            return;
        } else if (!photo) {
            console.error('no such photo');
            response.status(401).send('no such photo');
        } else {

            photo.comments.splice(comment_index, 1);

            photo.save();
            response.status(200).send();

        }

    });

});
// delect account of a user, removing photos, likes, comments, profile
app.post("/delete/:id", function(request, response) {
    var id = request.params.id;

    // remove all photos of the user

    Photo.remove({
        user_id: id
    }, function(err) {
        if (err) {
            console.err(err);
            response.status(401).send("error locating photo");
            return;
        }
    });

    // update like and comments of every photo
    Photo.find({}, function(err, allPhotos) {
        if (err) {
            console.error('deleting comment error', err);
            response.status(400).send(JSON.stringify(err));
            return;
        }
        for (var i = 0; i < allPhotos.length; i++) {
            if (allPhotos[i].likes.indexOf(id) >= 0) {
                allPhotos[i].likes.splice(indexOf(id), 1);
                allPhotos[i].numLikes = allPhotos[i].likes.length;
            }

            allPhotos[i].comments = allPhotos[i].comments.filter(function(cmt) {
                return cmt.user_id.toString() !== id;
            });

            allPhotos[i].save();
        }
    });

    // delete user profile
    User.remove({
        _id: id
    }, function(err) {
        if (err) {
            response.status(401).send("err removing user");
            return;
        }
        request.session.destroy(function(err2) {
            if (err) {
                response.status(401).send("error ending session");
                return;
            }
            response.status(200).send();
            return;
        });
    });


});

var port = process.env.PORT || 3000;
var server = app.listen(port , function() {
    var server_port = server.address().port;
    console.log('Listening at http://localhost:' + server_port + ' exporting the directory ' + __dirname);
});
