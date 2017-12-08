"use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 *
 */

var mongoose = require('mongoose');
var async = require('async');
var session = require('express-session');
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

// XXX - Your submission should work without this line
var cs142models = require('./modelData/photoApp.js').cs142models;

mongoose.connect('mongodb://localhost/cs142project6');

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));
app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: false
}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
    response.send('Simple web server of files from ' + __dirname);
});

/*
 * Use express to handle argument passing in the URL.  This .get will cause express
 * To accept URLs with /test/<something> and return the something in request.params.p1
 * If implement the get as follows:
 * /test or /test/info - Return the SchemaInfo object of the database in JSON format. This
 *                       is good for testing connectivity with  MongoDB.
 * /test/counts - Return an object with the counts of the different collections in JSON format
 */
app.get('/test/:p1', function(request, response) {
    // Express parses the ":p1" from the URL and returns it in the request.params objects.
    console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        // Fetch the SchemaInfo. There should only one of them. The query of {} will match it.
        SchemaInfo.find({}, function(err, info) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            // We got the object - return it in JSON format.
            console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        // In order to return the counts of all the collections we need to do an async
        // call to each collections. That is tricky to do so we use the async package
        // do the work.  We put the collections into array and use async.each to
        // do each .count() query.
        var collections = [{
                name: 'user',
                collection: User
            },
            {
                name: 'photo',
                collection: Photo
            },
            {
                name: 'schemaInfo',
                collection: SchemaInfo
            }
        ];
        async.each(collections, function(col, done_callback) {
            col.collection.count({}, function(err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function(err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));

            }
        });
    } else {
        // If we know understand the parameter we return a (Bad Parameter) (400) status.
        response.status(400).send('Bad param ' + param);
    }
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
 * XXX change here!
 */
app.get('/user/:id', function(request, response) {

        var id = request.params.id;
        User.findOne({
            _id: id
        }, function(err, user) {
            if (err !== null) {
                console.error("User not found.");
                response.status(400).send("Invalid User ID");
                return;
            }
            if (user === undefined) {
                response.status(400).send("Invalid User ID")
            }
            var userObj = {
                /* XXX */
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
     console.log("in server, get photos of user, id", id);
     Photo.find({
         'user_id': id
     }, function(err, photos) {
         if (err != null) {
             response.status(400).send(JSON.stringify(err));
             return;
         }
         var photoCopy = JSON.parse(JSON.stringify(photos));


         async.each(photoCopy, function(photo, callbackPhotos) {
             async.each(photo.comments, function(comment, callbackComments) {
                 User.findOne({
                     '_id': comment.user_id
                 }, function(err, user) {
                     if (err != null) {
                         console.error("Error");
                         response.status(400).send(JSON.stringify(err));
                         return;
                     }
                     else if (user === null) {
                         console.error("User not found.");
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
                 response.status(200).send(photoCopy);
             }
         });
     });
 });



/* XXX changed here! */
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
            console.log("log in successful");
        }
    });
});

 /*XXX and here!*/
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

app.get('/admin/logout', function(request, response) {
    request.session.destroy(function(err) {
        if (err) {
            response.status(401).send();
            return;
        }
        response.status(200).send();
        return;
    });
})

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
                console.log("found the commented photo!")
                photo.comments.push({
                    comment: request.body.comment,
                    user_id: request.session.user._id
                });
                photo.save();
                response.status(200).send();
            }
        });

})

app.post('/photos/new', function(request, response) {
    console.log("in server, new photo")
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


        var timestamp = new Date().valueOf();
        var filename = 'U' + String(timestamp) + request.file.originalname;

        fs.writeFile("./images/" + filename, request.file.buffer, function(err) {
            // XXX - Once you have the file written into your images directory under the name
            // filename you can create the Photo object in the database
            if (err !== null) {
                response.status(400).send("file-error");
                return;
            }
            Photo.create({
                file_name: filename,
                user_id: request.session.user._id
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
})

app.post('/like/:photo_id', function(request, response) {
    var photoId = request.params.photo_id;
    Photo.findOne({
        _id: photoId
    }, function(err, photo) {
        if (err) {
            console.error("Error liking photo");
            reponse.status(401).send("error-like");
            return
        }
        else if (photo === null) {
            console.error("Can't find photo");
            reponse.status(401).send("error-like-invalid-photo");
        }
        else {
            var userId = request.session.user._id;
            var userIndex = photo.likes.indexOf(userId);
            if (userIndex < 0) {
                photo.likes.push(userId);
                photo.numLikes = photo.likes.length;
            }
            else {
                photo.likes.splice(userIndex, 1);
                photo.numLikes = photo.likes.length;
            }
            photo.save();
            response.status(200).send("Like/Unlike succuessful");
        }
    });
});

var server = app.listen(3000, function() {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});
