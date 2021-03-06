var assert = require('assert');
var should = require('should');
var agent = require('supertest');
var mysql = require('mysql');
var config = require('../config');
var flow = require('nimble');
var httpStatus = require('http-status');
var Database = require("../models/Database");
var DuplicateRecordError = require('../lib/errors').DuplicateRecordError;
var JSendError = require('jsend-utils').JSendError;
var JSendClientError = require('jsend-utils').JSendClientError;
var fs = require('fs');
var deleteDir = require('rimraf');

var log4js = require('log4js');
log4js.configure('log4js-config-test.json');
var log = log4js.getLogger('esdr:test');

describe("ESDR", function() {
   var url = "http://localhost:3001";
   var esdrAdminUser = {
      email : "esdr-admin@esdr.cmucreatelab.org",
      password : "password",
      displayName : "ESDR Admin"
   };
   var testUser1 = {
      email : "test@user.com",
      password : "password",
      displayName : "Test User"
   };
   var testUser2 = {
      email : "test2@user.com",
      password : "password2"
   };
   var testUser3 = {
      email : "test3@user.com",
      password : "password3",
      displayName : ""
   };
   var testUser4 = {
      email : "test4@user.com",
      password : "password4",
      displayName : ""
   };
   var testUserNeedsTrimming = {
      email : "    test_trimming@user.com ",
      password : "password",
      displayName : "    Test User Trimming   "
   };
   var testClient = {
      displayName : "Test Client 1",
      clientName : "test_client_1",
      email : "test1@test.com",
      clientSecret : "I am test client 1",
      resetPasswordUrl : "http://test-client-1.com:3333/password-reset/:resetPasswordToken",
      verificationUrl : "http://test-client-1.com:3333/user-verification/:verificationToken"
   };
   var testClient2 = {
      displayName : "Test Client 2",
      clientName : "test_client_2",
      email : "test2@test.com",
      clientSecret : "I am test client 2",
      resetPasswordUrl : "http://test-client-2.com:3333/password-reset/:resetPasswordToken",
      verificationUrl : "http://test-client-2.com:3333/user-verification/:verificationToken"
   };
   var testClient3 = {
      displayName : "Test Client 3",
      clientName : "test_client_3",
      clientSecret : "I am test client 3",
      isPublic : false
   };
   var testClientNeedsTrimming = {
      displayName : "   Test Client Trimming  ",
      clientName : "  test_client_trimming             ",
      clientSecret : "I've got a secret / I've been hiding / Under my skin",
      resetPasswordUrl : "http://localhost:3333/password-reset/:resetPasswordToken",
      verificationUrl : "http://localhost:3333/user-verification/:verificationToken"
   };
   var testProduct1 = {
      name : 'cattfish_v1',
      prettyName : 'CATTfish v1',
      vendor : 'CMU CREATE Lab',
      description : 'The CATTfish v1 water temperature and conductivity sensor.',
      defaultChannelSpecs : {
         "temperature" : { "prettyName" : "Temperature", "units" : "C" },
         "conductivity" : { "prettyName" : "Conductivity", "units" : "&mu;S/cm" },
         "battery_voltage" : { "prettyName" : "Battery Voltage", "units" : "V" }
      }
   };
   var testProduct2 = {
      name : 'cattfish_v2',
      prettyName : 'CATTfish v2',
      vendor : 'CMU CREATE Lab',
      description : 'The CATTfish v2 water temperature and conductivity sensor.',
      defaultChannelSpecs : {
         "temperature" : { "prettyName" : "Temperature", "units" : "C" },
         "conductivity" : { "prettyName" : "Conductivity", "units" : "&mu;S/cm" },
         "error_codes" : { "prettyName" : "Error Codes", "units" : null }
      }
   };
   var testProduct3 = {
      name : 'cattfish_v3',
      prettyName : 'CATTfish v3',
      vendor : 'CMU CREATE Lab',
      description : 'The CATTfish v3 water temperature and conductivity sensor.',
      defaultChannelSpecs : {
         "temperature" : { "prettyName" : "Temperature", "units" : "C" },
         "conductivity" : { "prettyName" : "Conductivity", "units" : "&mu;S/cm" }
      }
   };
   var testProduct4 = {
      name : 'cattfish_v4',
      prettyName : 'CATTfish v4',
      vendor : 'CMU CREATE Lab',
      description : 'The CATTfish v4 water temperature and conductivity sensor.',
      defaultChannelSpecs : {
         "temperature" : { "prettyName" : "Temperature", "units" : "C" },
         "conductivity" : { "prettyName" : "Conductivity", "units" : "&mu;S/cm" },
         "error_codes" : { "prettyName" : "Error Codes", "units" : null },
         "battery_voltage" : { "prettyName" : "Battery Voltage", "units" : "V" },
         "humidity" : { "prettyName" : "Humidity", "units" : "%" }
      }
   };
   var testProduct5 = {
      name : 'cattfish_v5',
      prettyName : 'CATTfish v5',
      vendor : 'CMU CREATE Lab',
      description : 'The CATTfish v5 water temperature and conductivity sensor.',
      defaultChannelSpecs : { "conductivity" : { "prettyName" : "Conductivity", "units" : "&mu;S/cm" } }
   };
   var testDevice1 = {
      name : 'My Awesome Device',
      serialNumber : 'TESTDEVICE1'
   };
   var testDevice2 = {
      serialNumber : 'TESTDEVICE2'
   };
   var testDevice3 = {
      serialNumber : 'TESTDEVICE3'
   };
   var testDevice4 = {
      serialNumber : 'TESTDEVICE4'
   };
   var testDevice5 = {
      serialNumber : 'TESTDEVICE5'
   };

   var testFeed1a = {
      name : "Newell Simon 3rd Floor Bathroom",
      exposure : "outdoor",
      isPublic : 1,
      isMobile : 0,
      latitude : 40.443403,
      longitude : -79.94564
   };

   var testFeed1b = {
      name : "Newell Simon 4th Floor Kitchen",
      exposure : "indoor",
      isPublic : 0,
      isMobile : 0,
      latitude : 40.443493,
      longitude : -79.945721
   };

   var testFeed1c = {
      name : "Newell Simon 5th Floor Kitchen",
      exposure : "indoor",
      isPublic : 0,
      isMobile : 0,
      latitude : 40.443493,
      longitude : -79.945721,
      channelSpecs : { "particle_count" : { "prettyName" : "Particle Count", "units" : "particles" } }
   };

   var testFeed2a = {
      name : "Newell Simon A Level (Public)",
      exposure : "outdoor",
      isPublic : 1,
      isMobile : 0,
      latitude : 40.443493,
      longitude : -79.945721
   };

   var testFeed2b = {
      name : "Newell Simon B Level (Private)",
      exposure : "indoor",
      isPublic : 0,
      isMobile : 0,
      latitude : 40.443493,
      longitude : -79.945721
   };

   var testFeed3 = {
      name : "Upstairs Bathroom",
      exposure : "indoor",
      isPublic : 0,
      isMobile : 0,
      latitude : 40.443679814953626,
      longitude : -79.94643892510089
   };

   var testFeed1aData1 = {
      "channel_names" : ["temperature", "conductivity", "battery_voltage"],
      "data" : [
         [1380276279.1, 19.0, 516, 3.85],
         [1380449602, 19.2, 485, 3.84],
         [1380472357, 18.6, 485, 3.84],
         [1380556690, 18.3, 501, 3.84],
         [1380643808, 19.5, 583, 3.84],
         [1380725507, 19.6, 551, 3.84],
         [1380752155, 20.0, 511, 3.84],
         [1380836116, 20.7, 491, 3.84],
         [1380883999, 21.1, 612, 3.84],
         [1380909922, 20.3, 587, 3.84],
         [1380922452, 19.5, 571, 3.84],
         [1380969641, 21.8, 495, 3.84],
         [1381002132, 21.6, 503, 3.84],
         [1381062285, 22.2, 464, 3.84],
         [1381154132.009, 18.5, 565, 3.84]
      ]
   };
   var testFeed1aData2 = {
      "channel_names" : ["temperature", "conductivity", "battery_voltage"],
      "data" : [
         [1381238902.42, 18.2, 536, 3.84],
         [1381242668, 17.7, 541, 3.84],
         [1381353442, 19.5, 611, 3.84],
         [1381403282, 20.8, 607, 3.84],
         [1381485424, 20.6, 585, 3.84],
         [1381490906, 20.3, 587, 3.84],
         [1381516627, 20.2, 570, 3.84],
         [1381572510, 20.3, 526, 3.84],
         [1381636650, 19.9, 493, 3.84],
         [1381667243, 20.4, 483, 3.84],
         [1381671206, 19.9, 478, 3.84],
         [1381801851, 20.6, 486, 3.84],
         [1381802188, 20.6, 508, 3.84],
         [1381840404, 20.8, 506, 3.84],
         [1381856528, 18.9, 605, 3.84],
         [1381917431, 20.5, 624, 3.84],
         [1382006980, 20.6, 543, 3.84],
         [1382054188, 19.6, 517, 3.84]
      ]
   };

   var testFeed1aData3 = {
      "channel_names" : ["temperature"],
      "data" : [
         [1380270001, 14.2],
         [1382055042, 33.9]
      ]
   };

   var testFeed1aData4 = {
      "channel_names" : ["conductivity"],
      "data" : [
         [1380752248, 500],
         [1380752359, 501]
      ]
   };

   var testFeed2aData = {
      "channel_names" : ["humidity", "particle_concentration", "annotation"],
      "data" : [
         [1414982815, 38, 7.1, null],
         [1414982833, 38, 11.9, null],
         [1414982875, 39, 6.9, null],
         [1414982893, 38, 101.9, "This value is too high"],
         [1414982935, 38, 7.2, null],
         [1414982953, 38, 11.4, null],
         [1414985704, 41, 4.2, null],
         [1414985719, 0, 0, "Why are these zero?"],
         [1414985764, 38, 11.3, null],
         [1414985779, 39, 7.5, null],
      ]
   };

   var testFeed2bData = {
      "channel_names" : ["humidity", "particle_concentration", "annotation"],
      "data" : [
         [1414986064, 35, 22.6, null],
         [1414986079, 34, 20.1, null],
         [1414986124, 34, 22.8, "Bad smell today!"],
         [1414986139, 35, 19.5, null],
         [1414986184, 34, 22.5, null],
         [1414986199, 34, 18.8, null],
         [1414986244, 35, 21.7, null],
         [1414986259, 34, 19.8, null],
         [1414986304, 34, 22.9, null],
         [1414986319, 34, 19.5, null]
      ]
   };

   var testFeed1aTile10_2633 = {
      "data" : [
         [1380472357, 18.6, 0, 1],
         [1380556690, 18.3, 0, 1],
         [1380643808, 19.5, 0, 1],
         [1380725507, 19.6, 0, 1],
         [1380752155, 20, 0, 1],
         [1380836116, 20.7, 0, 1],
         [1380883999, 21.1, 0, 1],
         [1380909922, 20.3, 0, 1],
         [1380922452, 19.5, 0, 1],
         [1380969641, 21.8, 0, 1]
      ],
      "fields" : ["time", "mean", "stddev", "count"],
      "level" : 10,
      "offset" : 2633,
      "type" : "value"
   };

   var testFeed1bTile10_2634 = {
      "data" : [
         [1381106747.21, -1e308, 0, 0],
         [1381238902.42, 18.2, 0, 1],
         [1381242668, 17.7, 0, 1],
         [1381353442, 19.5, 0, 1],
         [1381403282, 20.8, 0, 1],
         [1381485424, 20.6, 0, 1],
         [1381490906, 20.3, 0, 1]
      ],
      "fields" : ["time", "mean", "stddev", "count"],
      "level" : 10,
      "offset" : 2634,
      "type" : "value"
   };

   var multifeed1 = {
      "spec" : [
         {
            "feeds" : "whereOr=exposure=outdoor,name=bogus",
            "channels" : ["particle_concentration", "humidity"]
         }
      ]
   };

   var multifeed2 = {
      "name" : "My_Awesome_Multifeed",
      "spec" : [
         {
            "feeds" : "whereOr=exposure=outdoor,productId=42",
            "channels" : ["particle_concentration", "humidity", "conductivity"]
         },
         {
            "feeds" : "whereOr=productId=343,name=Newell Simon 3rd Floor Bathroom",
            "channels" : ["temperature", "conductivity"]
         }
      ]
   };

   var shallowClone = function(obj) {
      if (obj) {
         var clone = {};
         Object.keys(obj).forEach(function(key) {
            clone[key] = obj[key];
         });
         return clone;
      }
      return obj;
   };

   var db = null;
   var verificationTokens = {};
   var createdUsers = {};

   var pool = mysql.createPool({
                                  connectionLimit : config.get("database:pool:connectionLimit"),
                                  host : config.get("database:host"),
                                  port : config.get("database:port"),
                                  database : config.get("database:database"),
                                  user : config.get("database:username"),
                                  password : config.get("database:password")
                               });

   // Delete the datastore data directory and then make sure the database tables exist
   // and, if so, wipe the tables clean
   before(function(initDone) {

      // delete the data directory, so we're sure we're always starting fresh
      var DATASTORE_DATA_DIRECTORY = config.get("datastore:dataDirectory");
      deleteDir(DATASTORE_DATA_DIRECTORY, function(err) {
         if (err) {
            return initDone(err);
         }

         // create the data directory
         fs.mkdir(DATASTORE_DATA_DIRECTORY, function(err) {
            if (err) {
               return initDone(err);
            }

            // Make sure the database is initialized
            Database.create(function(err, theDatabase) {
               if (err) {
                  throw err;
               }
               db = theDatabase;
               pool.getConnection(function(err, connection) {
                  if (err) {
                     throw err;
                  }

                  flow.series([
                                 function(done) {
                                    connection.query("DELETE FROM Multifeeds", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                                 function(done) {
                                    connection.query("DELETE FROM Feeds", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                                 function(done) {
                                    connection.query("DELETE FROM Devices", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                                 function(done) {
                                    connection.query("DELETE FROM Products", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                                 function(done) {
                                    connection.query("DELETE FROM Tokens", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                                 function(done) {
                                    connection.query("DELETE FROM Clients WHERE clientName <> 'ESDR'", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                                 function(done) {
                                    connection.query("DELETE FROM Users", function(err) {
                                       if (err) {
                                          throw err;
                                       }

                                       done();
                                    });
                                 },
                              ],
                              initDone);
               });
            });
         });
      })
   });

   describe("REST API", function() {
      describe("Clients", function() {
         var accessToken = null;

         // To create a client, we have a bit of a chicken-and-egg scenario.  We need to have an OAuth2 access token to
         // create a client, but you can't get one without auth'ing against a client.  So, here, we'll create a user
         // using the ESDR client, verify that user, and then get an access token for that user (using the ESDR client)
         // so that we can create new clients.
         before(function(initDone) {
            // create a user, auth'd against ESDR
            agent(url)
                  .post("/api/v1/users")
                  .auth(config.get("esdrClient:clientName"), config.get("esdrClient:clientSecret"))
                  .send(esdrAdminUser)
                  .end(function(err, res) {
                          if (err) {
                             return initDone(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id');
                          res.body.data.should.have.property('email', esdrAdminUser.email);
                          res.body.data.should.have.property('displayName', esdrAdminUser.displayName);
                          res.body.data.should.have.property('verificationToken');

                          // remember the verification token so we can verify this user below
                          var createdUser = res.body.data;
                          var verificationToken = createdUser.verificationToken;

                          // verify this new user
                          agent(url)
                                .put("/api/v1/user-verification")
                                .send({ token : verificationToken })
                                .end(function(err, res) {
                                        if (err) {
                                           return initDone(err);
                                        }

                                        res.should.have.property('status', httpStatus.OK);
                                        res.body.should.have.property('code', httpStatus.OK);
                                        res.body.should.have.property('status', 'success');
                                        res.body.should.have.property('data');
                                        res.body.data.should.have.property('isVerified', true);

                                        // finaly, request an access token for this user
                                        agent(url)
                                              .post("/oauth/token")
                                              .send({
                                                       grant_type : "password",
                                                       client_id : config.get("esdrClient:clientName"),
                                                       client_secret : config.get("esdrClient:clientSecret"),
                                                       username : esdrAdminUser.email,
                                                       password : esdrAdminUser.password
                                                    })
                                              .end(function(err, res) {
                                                      if (err) {
                                                         return initDone(err);
                                                      }

                                                      res.should.have.property('status', httpStatus.OK);
                                                      res.body.should.have.property('access_token');
                                                      res.body.should.have.property('refresh_token');
                                                      res.body.should.have.property('token_type', "Bearer");

                                                      accessToken = res.body.access_token;

                                                      initDone();
                                                   });

                                     });

                       });
         });

         it("Should be able to create a new client", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send(testClient)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('displayName', testClient.displayName);
                          res.body.data.should.have.property('clientName', testClient.clientName);
                          done();
                       });
         });

         it("Should trim the displayName and clientName when creating a new client", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send(testClientNeedsTrimming)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('displayName', testClientNeedsTrimming.displayName.trim());
                          res.body.data.should.have.property('clientName', testClientNeedsTrimming.clientName.trim());
                          done();
                       });
         });

         it("Should fail to create the same client again", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send(testClient)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CONFLICT);
                          res.body.should.have.property('code', httpStatus.CONFLICT);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('clientName', testClient.clientName);
                          done();
                       });
         });

         it("Should fail to create a new client with missing required values", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({})
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(2);
                          res.body.data[0].should.have.property('instanceContext', '#');
                          res.body.data[0].should.have.property('constraintName', 'required');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.required);
                          res.body.data[1].should.have.property('instanceContext', '#/clientSecret');
                          res.body.data[1].should.have.property('constraintName', 'type');
                          res.body.data[1].should.have.property('constraintValue', 'string');
                          done();
                       });
         });

         it("Should fail to create a new client with a display name that's too short", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : "T",
                           clientName : testClient.clientName,
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/displayName');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.displayName.minLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a display name that's too long", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : "thisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstring",
                           clientName : testClient.clientName,
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/displayName');
                          res.body.data[0].should.have.property('constraintName', 'maxLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.displayName.maxLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a client name that's too short", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : "t",
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/clientName');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.clientName.minLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a client name that's too long", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : "thisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstring",
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/clientName');
                          res.body.data[0].should.have.property('constraintName', 'maxLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.clientName.maxLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a client name that doesn't start with an alphanumeric character", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : ".cannot_start_with_non_alphanumeric",
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/clientName');
                          res.body.data[0].should.have.property('constraintName', 'pattern');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.clientName.pattern);
                          done();
                       });
         });

         it("Should fail to create a new client with a client name that contains illegal characters", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : "cannot/have/slashes or spaces",
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/clientName');
                          res.body.data[0].should.have.property('constraintName', 'pattern');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.clientName.pattern);
                          done();
                       });
         });

         it("Should fail to create a new client with a client secret that's too short", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : testClient.clientName,
                           clientSecret : "I",
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/clientSecret');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.clientSecret.minLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a client secret that's too long", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : testClient.clientName,
                           clientSecret : "thisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstring",
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/clientSecret');
                          res.body.data[0].should.have.property('constraintName', 'maxLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.clientSecret.maxLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a reset password URL that's too short", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : testClient.clientName,
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : "foo",
                           verificationUrl : testClient.verificationUrl
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/resetPasswordUrl');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.resetPasswordUrl.minLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a verification URL that's too short", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send({
                           displayName : testClient.displayName,
                           clientName : testClient.clientName,
                           clientSecret : testClient.clientSecret,
                           resetPasswordUrl : testClient.resetPasswordUrl,
                           verificationUrl : "foo"
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/verificationUrl');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.clients.jsonSchema.properties.verificationUrl.minLength);
                          done();
                       });
         });

         it("Should fail to create a new client with a client name that's already in use", function(done) {
            agent(url)
                  .post("/api/v1/clients")
                  .set({ Authorization : "Bearer " + accessToken })
                  .send(testClient)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CONFLICT);
                          res.body.should.have.property('code', httpStatus.CONFLICT);
                          res.body.should.have.property('status', 'error');
                          done();
                       });
         });
      });

      describe("Users", function() {

         it("Should be able to create a new user", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send(testUser1)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id');
                          res.body.data.should.have.property('email', testUser1.email);
                          res.body.data.should.have.property('displayName', testUser1.displayName);
                          res.body.data.should.have.property('verificationToken');

                          // remember the verification token so we can verify this user
                          verificationTokens.testUser1 = res.body.data.verificationToken;
                          createdUsers.testUser1 = res.body.data;
                          done();
                       });
         });

         it("Should trim the email and displayName when creating a new user", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send(testUserNeedsTrimming)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id');
                          res.body.data.should.have.property('email', testUserNeedsTrimming.email.trim());
                          res.body.data.should.have.property('displayName', testUserNeedsTrimming.displayName.trim());
                          res.body.data.should.have.property('verificationToken');

                          done();
                       });
         });

         it("Should fail to create the same user again", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send(testUser1)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CONFLICT);
                          res.body.should.have.property('code', httpStatus.CONFLICT);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('email', testUser1.email);
                          done();
                       });
         });

         it("Should be able to create a new user with no display name", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send(testUser2)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id');
                          res.body.data.should.have.property('email', testUser2.email);
                          res.body.data.should.not.have.property('displayName');
                          res.body.data.should.have.property('verificationToken');

                          // remember the verification token so we can verify this user
                          verificationTokens.testUser2 = res.body.data.verificationToken;
                          createdUsers.testUser2 = res.body.data;
                          done();
                       });
         });

         it("Should be able to create a new user with empty display name", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send(testUser3)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id');
                          res.body.data.should.have.property('email', testUser3.email);
                          res.body.data.should.not.have.property('displayName', null);
                          res.body.data.should.have.property('verificationToken');

                          // remember the verification token so we can verify this user
                          verificationTokens.testUser3 = res.body.data.verificationToken;
                          createdUsers.testUser3 = res.body.data;
                          done();
                       });
         });

         it("Should fail to create a new user with missing user and client", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .send({})
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(2);
                          res.body.data[0].should.have.property('instanceContext', '#');
                          res.body.data[0].should.have.property('constraintName', 'required');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.required);
                          res.body.data[1].should.have.property('instanceContext', '#/password');
                          res.body.data[1].should.have.property('constraintName', 'type');
                          res.body.data[1].should.have.property('constraintValue', "string");

                          done();
                       });
         });

         it("Should be able to create a new user with no client specified", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .send(testUser4)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id');
                          res.body.data.should.have.property('email', testUser4.email);
                          res.body.data.should.not.have.property('displayName', null);
                          res.body.data.should.have.property('verificationToken');

                          done();
                       });
         });

         it("Should fail to create a new user with missing user but present client", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({})
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(2);
                          res.body.data[0].should.have.property('instanceContext', '#');
                          res.body.data[0].should.have.property('constraintName', 'required');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.required);
                          res.body.data[1].should.have.property('instanceContext', '#/password');
                          res.body.data[1].should.have.property('constraintName', 'type');
                          res.body.data[1].should.have.property('constraintValue', "string");
                          done();
                       });
         });

         it("Should fail to create a new user with an email address that's too short", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({
                           email : "t@t.c",
                           password : testUser1.password,
                           displayName : testUser1.displayName
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/email');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.properties.email.minLength);
                          done();
                       });
         });

         it("Should fail to create a new user with an email address that's too long", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({
                           email : "thisisaverylongemailaddressthatismuchtoolongandsoitwillfailvalidation@domainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainnamedomainname.com",
                           password : testUser1.password,
                           displayName : testUser1.displayName
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/email');
                          res.body.data[0].should.have.property('constraintName', 'maxLength');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.properties.email.maxLength);
                          done();
                       });
         });

         it("Should fail to create a new user with a password that's too short", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({
                           email : testUser1.email,
                           password : "p",
                           displayName : testUser1.displayName
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/password');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.properties.password.minLength);
                          done();
                       });
         });

         it("Should fail to create a new user with a password that's too long", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({
                           email : testUser1.email,
                           password : "thisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstring",
                           displayName : testUser1.displayName
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/password');
                          res.body.data[0].should.have.property('constraintName', 'maxLength');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.properties.password.maxLength);
                          done();
                       });
         });

         it("Should fail to create a new user with a display name that's too long", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({
                           email : testUser1.email,
                           password : testUser1.password,
                           displayName : "thisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstringthisisareallylongstring"
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/displayName');
                          res.body.data[0].should.have.property('constraintName', 'maxLength');
                          res.body.data[0].should.have.property('constraintValue', db.users.jsonSchema.properties.displayName.maxLength);
                          done();
                       });
         });

         it("Should fail to create a new user with a email address that's invalid", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({
                           email : "not_a_real_email_address",
                           password : testUser1.password,
                           displayName : testUser1.displayName
                        })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/email');
                          res.body.data[0].should.have.property('constraintName', 'format');
                          res.body.data[0].should.have.property('constraintValue', 'email');
                          res.body.data[0].should.have.property('kind', 'FormatValidationError');
                          done();
                       });
         });

         it("Should fail to create a new user with a email address that's already in use", function(done) {
            agent(url)
                  .post("/api/v1/users")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send(testUser1)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CONFLICT);
                          res.body.should.have.property('code', httpStatus.CONFLICT);
                          res.body.should.have.property('status', 'error');
                          done();
                       });
         });

         describe("Account Verification", function() {
            it("Should be able to request that the verification token be sent again (after creation, before verification)", function(done) {
               agent(url)
                     .post("/api/v1/user-verification")
                     .auth(testClient.clientName, testClient.clientSecret)
                     .send({ email : testUser1.email })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.CREATED);
                             res.body.should.have.property('code', httpStatus.CREATED);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('email', testUser1.email);
                             res.body.data.should.have.property('isVerified', false);
                             res.body.data.should.have.property('verified', '0000-00-00 00:00:00');
                             res.body.data.should.have.property('verificationToken', verificationTokens.testUser1);

                             done();
                          });
            });

            it("Should be able to verify a user", function(done) {

               agent(url)
                     .put("/api/v1/user-verification")
                     .send({ token : verificationTokens.testUser1 })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('isVerified', true);

                             done();
                          });
            });

            it("Should be able to verify another user", function(done) {

               agent(url)
                     .put("/api/v1/user-verification")
                     .send({ token : verificationTokens.testUser2 })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('isVerified', true);

                             done();
                          });
            });

            it("Should be able to request that the verification token be sent again (after creation, after verification)", function(done) {
               agent(url)
                     .post("/api/v1/user-verification")
                     .auth(testClient.clientName, testClient.clientSecret)
                     .send({ email : testUser1.email })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('email', testUser1.email);
                             res.body.data.should.have.property('isVerified', true);
                             res.body.data.should.have.property('verificationToken', verificationTokens.testUser1);

                             done();
                          });
            });

            it("Should return the same thing if a request to send the verification token is made again", function(done) {

               agent(url)
                     .post("/api/v1/user-verification")
                     .auth(testClient.clientName, testClient.clientSecret)
                     .send({ email : testUser1.email })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('isVerified', true);

                             done();
                          });

            });

            it("A request for the verification token to be sent should not require client authentication", function(done) {

               agent(url)
                     .post("/api/v1/user-verification")
                     .send({ email : testUser1.email })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('isVerified', true);

                             done();
                          });

            });

            it("A request for the verification token to be sent should fail if the client authentication is invalid", function(done) {

               agent(url)
                     .post("/api/v1/user-verification")
                     .auth(testClient.clientName, "bogus")
                     .send({ email : testUser1.email })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNAUTHORIZED);
                             res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data');

                             done();
                          });

            });

            it("Verification should fail for a missing verification token", function(done) {

               agent(url)
                     .put("/api/v1/user-verification")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data', null);

                             done();
                          });
            });

            it("Verification should fail for a bogus verification token", function(done) {

               agent(url)
                     .put("/api/v1/user-verification")
                     .send({ token : "bogus_token" })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.BAD_REQUEST);
                             res.body.should.have.property('code', httpStatus.BAD_REQUEST);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('isVerified', false);

                             done();
                          });
            });

            it("Should fail when requesting that the verification token be sent again for an unknown user", function(done) {
               var unknownUser = { email : 'unknown@unknown.com' };
               agent(url)
                     .post("/api/v1/user-verification")
                     .auth(testClient.clientName, testClient.clientSecret)
                     .send({ email : unknownUser.email })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.BAD_REQUEST);
                             res.body.should.have.property('code', httpStatus.BAD_REQUEST);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data');
                             res.body.should.have.property('data');
                             should(res.body.data).eql({ email : unknownUser.email });

                             done();
                          });
            });

            it("Should fail when requesting that the verification token be sent again but the email address is not given", function(done) {
               agent(url)
                     .post("/api/v1/user-verification")
                     .send({})
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data', null);

                             done();
                          });
            });
         });
      });

      describe("Reset Password Request", function() {
         var resetPasswordToken = null;
         var oldPassword = testUser1.password;
         var newPassword = "this is the new password";

         it("Should be able to request a password reset token", function(done) {
            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({ email : testUser1.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('email', testUser1.email);
                          res.body.data.should.have.property('resetPasswordToken');

                          // remember the reset password token
                          resetPasswordToken = res.body.data.resetPasswordToken;
                          done();
                       });
         });

         it("Should be able to request a password reset token again, and get a different token", function(done) {
            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({ email : testUser1.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('email', testUser1.email);
                          res.body.data.should.have.property('resetPasswordToken');
                          (resetPasswordToken != res.body.data.resetPasswordToken).should.be.true;

                          // remember the reset password token
                          resetPasswordToken = res.body.data.resetPasswordToken;
                          done();
                       });
         });

         it("Should fail to set the password if the reset password token is missing", function(done) {
            agent(url)
                  .put("/api/v1/password-reset")
                  .send({ password : newPassword })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data', null);

                          done();
                       });
         });

         it("Should fail to set the password using an invalid reset password token", function(done) {
            agent(url)
                  .put("/api/v1/password-reset")
                  .send({ password : newPassword, token : "bogus" })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.BAD_REQUEST);
                          res.body.should.have.property('code', httpStatus.BAD_REQUEST);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data', null);

                          done();
                       });
         });

         it("Should fail to set the password using an invalid password", function(done) {
            var invalidPassword = "a";
            agent(url)
                  .put("/api/v1/password-reset")
                  .send({ password : invalidPassword, token : resetPasswordToken })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.length(1);
                          res.body.data[0].should.have.property('instanceContext', '#/password');
                          res.body.data[0].should.have.property('constraintName', 'minLength');
                          res.body.data[0].should.have.property('constraintValue', 5);
                          res.body.data[0].should.have.property('testedValue', invalidPassword.length);
                          res.body.data[0].should.have.property('kind', 'StringValidationError');

                          done();
                       });
         });

         it("Should be able to set the password using the reset password token", function(done) {
            agent(url)
                  .put("/api/v1/password-reset")
                  .send({ password : newPassword, token : resetPasswordToken })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.OK);
                          res.body.should.have.property('code', httpStatus.OK);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data', null);

                          testUser1.password = newPassword;
                          done();
                       });
         });

         it("Should fail to find the user by email and the old password", function(done) {
            db.users.findByEmailAndPassword(testUser1.email, oldPassword, function(err, user) {
               if (err) {
                  return done(err);
               }
               (user == null).should.be.true;

               done();
            });
         });

         it("Should be able to find the user by email and the new password", function(done) {
            db.users.findByEmailAndPassword(testUser1.email, newPassword, function(err, user) {
               if (err) {
                  return done(err);
               }
               user.should.have.property("id");
               user.should.have.property("email", testUser1.email);
               user.should.have.property("password");
               user.should.have.property("displayName", testUser1.displayName);
               user.should.have.property("created");
               user.should.have.property("modified");

               done();
            });
         });

         it("Should fail to request a password reset token if email is not specified", function(done) {
            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data', null);
                          done();
                       });
         });

         it("Should fail to request a password reset token for an invalid email", function(done) {
            var invalidEmail = { email : 'invalid' };
            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({ email : invalidEmail.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('email', invalidEmail.email);

                          done();
                       });
         });

         it("Should fail to request a password reset token for an unknown email", function(done) {
            var unknownUser = { email : 'unknown@unknown.com' };
            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(testClient.clientName, testClient.clientSecret)
                  .send({ email : unknownUser.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.BAD_REQUEST);
                          res.body.should.have.property('code', httpStatus.BAD_REQUEST);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('email', unknownUser.email);

                          done();
                       });
         });

         it("A request for a password reset token to be sent should not require client authentication", function(done) {
            agent(url)
                  .post("/api/v1/password-reset")
                  .send({ email : testUser1.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.CREATED);
                          res.body.should.have.property('code', httpStatus.CREATED);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          done();
                       });
         });

         it("A request for a password reset token to be sent should fail if the client authentication is invalid", function(done) {

            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(testClient.clientName, "bogus")
                  .send({ email : testUser1.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNAUTHORIZED);
                          res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');

                          done();
                       });
         });

         it("Should fail to request a password reset token for an invalid client", function(done) {
            var bogusClient = {
               displayName : "Bogus Client",
               clientName : "bogus_client",
               clientSecret : "I am bogus"
            };
            agent(url)
                  .post("/api/v1/password-reset")
                  .auth(bogusClient.clientName, bogusClient.clientSecret)
                  .send({ email : testUser1.email })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNAUTHORIZED);
                          res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data', null);
                          done();
                       });
         });

         it("Should fail to request a password reset token if not client is specified", function(done) {

            agent(url)
                  .post("/api/v1/password-reset")
                  .send({ user : { email : testUser1.email } })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data', null);
                          done();
                       });
         });

      });   // end Reset Password Request

      describe("Clients, Products, Devices, and Feeds", function() {

         var accessTokens = {};

         before(function(initDone) {
            // request access and refresh tokens
            var requestTokens = function(user, callback) {
               agent(url)
                     .post("/oauth/token")
                     .send({
                              grant_type : "password",
                              client_id : testClient.clientName,
                              client_secret : testClient.clientSecret,
                              username : user.email,
                              password : user.password
                           })
                     .end(function(err, res) {
                             if (err) {
                                return initDone(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('access_token');
                             res.body.should.have.property('refresh_token');
                             res.body.should.have.property('token_type', "Bearer");

                             // return the tokens
                             callback(res.body);
                          });
            };

            flow.series([
                           function(done) {
                              requestTokens(testUser1, function(theTokens) {
                                 accessTokens.testUser1 = theTokens;
                                 done();
                              });
                           },
                           function(done) {
                              requestTokens(testUser2, function(theTokens) {
                                 accessTokens.testUser2 = theTokens;
                                 done();
                              });
                           }
                        ],
                        initDone);
         });

         describe("Clients (with authentication)", function() {
            it("Should be able to create a new client (with valid authentication)", function(done) {
               agent(url)
                     .post("/api/v1/clients")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .send(testClient2)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.CREATED);
                             res.body.should.have.property('code', httpStatus.CREATED);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('displayName', testClient2.displayName);
                             res.body.data.should.have.property('clientName', testClient2.clientName);
                             done();
                          });
            });

            it("Should be able to create another new client (with valid authentication)", function(done) {
               agent(url)
                     .post("/api/v1/clients")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .send(testClient3)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.CREATED);
                             res.body.should.have.property('code', httpStatus.CREATED);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('displayName', testClient3.displayName);
                             res.body.data.should.have.property('clientName', testClient3.clientName);
                             done();
                          });
            });

            it("Should fail to create a new client with bogus authentication", function(done) {
               agent(url)
                     .post("/api/v1/clients")
                     .set({
                             Authorization : "Bearer " + "bogus"
                          })
                     .send(testClient3)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNAUTHORIZED);
                             done();
                          });
            });

            it("Creating a client without specifying the email, verificationUrl, or resetPasswordUrl should result in the client getting the defaults", function(done) {
               agent(url)
                     .get("/api/v1/clients?where=clientName=" + testClient3.clientName)
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 1);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(1);

                             res.body.data.rows[0].should.have.property('email', config.get("esdrClient:email"));
                             res.body.data.rows[0].should.have.property('verificationUrl', config.get("esdrClient:verificationUrl"));
                             res.body.data.rows[0].should.have.property('resetPasswordUrl', config.get("esdrClient:resetPasswordUrl"));
                             done();
                          });
            });

            it("Should be able to find clients (without authentication) and only see all fields for public clients", function(done) {
               agent(url)
                     .get("/api/v1/clients")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 5);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(5);
                             res.body.data.rows.forEach(function(row) {
                                row.should.have.property('id');
                                row.should.have.property('displayName');
                                row.should.have.property('clientName');

                                row.should.have.property('creatorUserId');
                                row.should.have.property('isPublic');
                                row.should.have.property('created');
                                row.should.have.property('modified');

                                if (row['isPublic']) {
                                   row.should.have.property('email');
                                   row.should.have.property('verificationUrl');
                                   row.should.have.property('resetPasswordUrl');
                                }
                                else {
                                   row.should.not.have.property('email');
                                   row.should.not.have.property('verificationUrl');
                                   row.should.not.have.property('resetPasswordUrl');
                                }
                             });

                             done();
                          });
            });

            it("Should be able to find clients (with authentication) and see all fields for public clients and clients owned by testUser1", function(done) {
               agent(url)
                     .get("/api/v1/clients")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 5);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(5);
                             res.body.data.rows.forEach(function(row) {
                                row.should.have.property('id');
                                row.should.have.property('displayName');
                                row.should.have.property('clientName');

                                row.should.have.property('creatorUserId');
                                row.should.have.property('isPublic');
                                row.should.have.property('created');
                                row.should.have.property('modified');

                                if (row['isPublic'] || accessTokens.testUser1.userId == row.creatorUserId) {
                                   row.should.have.property('email');
                                   row.should.have.property('verificationUrl');
                                   row.should.have.property('resetPasswordUrl');
                                }
                                else {
                                   row.should.not.have.property('email');
                                   row.should.not.have.property('verificationUrl');
                                   row.should.not.have.property('resetPasswordUrl');
                                }
                             });

                             done();
                          });
            });

            it("Should be able to find clients (with authentication) and see all fields for public clients and clients owned by testUser2", function(done) {
               agent(url)
                     .get("/api/v1/clients")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser2.access_token
                          })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 5);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(5);
                             res.body.data.rows.forEach(function(row) {
                                row.should.have.property('id');
                                row.should.have.property('displayName');
                                row.should.have.property('clientName');

                                row.should.have.property('creatorUserId');
                                row.should.have.property('isPublic');
                                row.should.have.property('created');
                                row.should.have.property('modified');

                                if (row['isPublic'] || accessTokens.testUser2.userId == row.creatorUserId) {
                                   row.should.have.property('email');
                                   row.should.have.property('verificationUrl');
                                   row.should.have.property('resetPasswordUrl');
                                }
                                else {
                                   row.should.not.have.property('email');
                                   row.should.not.have.property('verificationUrl');
                                   row.should.not.have.property('resetPasswordUrl');
                                }
                             });

                             done();
                          });
            });

         });

         describe("Products", function() {

            var productIds = {};

            it("Should be able to create a new product (with authentication)", function(done) {
               agent(url)
                     .post("/api/v1/products")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .send(testProduct1)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.CREATED);
                             res.body.should.have.property('code', httpStatus.CREATED);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('id');
                             res.body.data.should.have.property('name', testProduct1.name);

                             // remember the product ID
                             productIds.testProduct1 = res.body.data.id;

                             done();
                          });
            });

            it("Should be able to create another new product, owned by a different user", function(done) {
               agent(url)
                     .post("/api/v1/products")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser2.access_token
                          })
                     .send(testProduct2)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.CREATED);
                             res.body.should.have.property('code', httpStatus.CREATED);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('id');
                             res.body.data.should.have.property('name', testProduct2.name);

                             // remember the product ID
                             productIds.testProduct2 = res.body.data.id;

                             done();
                          });
            });

            it("Should fail to create a new product without authentication", function(done) {
               agent(url)
                     .post("/api/v1/products")
                     .send(testProduct3)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNAUTHORIZED);

                             done();
                          });
            });

            it("Should fail to create a new product with bogus authentication", function(done) {
               agent(url)
                     .post("/api/v1/products")
                     .set({
                             Authorization : "Bearer " + "bogus"
                          })
                     .send(testProduct3)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNAUTHORIZED);

                             done();
                          });
            });

            it("Should fail to create a new product if the name is already in use", function(done) {
               agent(url)
                     .post("/api/v1/products")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .send(testProduct1)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.CONFLICT);
                             res.body.should.have.property('code', httpStatus.CONFLICT);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('name', testProduct1.name);

                             done();
                          });
            });

            it("Should fail to create a new product if the required fields are missing", function(done) {
               var product = shallowClone(testProduct1);
               delete product.name;
               delete product.prettyName;
               delete product.defaultChannelSpecs;

               agent(url)
                     .post("/api/v1/products")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .send(product)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data');
                             res.body.data.should.have.length(1);
                             res.body.data[0].should.have.property('instanceContext', '#');
                             res.body.data[0].should.have.property('constraintName', 'required');
                             res.body.data[0].should.have.property('desc', 'missing: name,prettyName,defaultChannelSpecs');
                             res.body.data[0].should.have.property('kind', 'ObjectValidationError');

                             done();
                          });
            });

            it("Should fail to create a new product if the fields with minLength are too short", function(done) {
               var product = shallowClone(testProduct1);
               product.name = "Yo";
               product.prettyName = "Ya";
               product.defaultChannelSpecs = 1;

               agent(url)
                     .post("/api/v1/products")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .send(product)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data');
                             res.body.data.should.have.length(3);
                             res.body.data[0].should.have.property('instanceContext', '#/name');
                             res.body.data[0].should.have.property('constraintName', 'minLength');
                             res.body.data[0].should.have.property('constraintValue', db.products.jsonSchema.properties.name.minLength);
                             res.body.data[0].should.have.property('testedValue', product.name.length);
                             res.body.data[1].should.have.property('instanceContext', '#/prettyName');
                             res.body.data[1].should.have.property('constraintName', 'minLength');
                             res.body.data[1].should.have.property('constraintValue', db.products.jsonSchema.properties.prettyName.minLength);
                             res.body.data[1].should.have.property('testedValue', product.prettyName.length);
                             res.body.data[2].should.have.property('instanceContext', '#/defaultChannelSpecs');
                             res.body.data[2].should.have.property('constraintName', 'minLength');
                             res.body.data[2].should.have.property('constraintValue', db.products.jsonSchema.properties.defaultChannelSpecs.minLength);
                             res.body.data[2].should.have.property('testedValue', 1);

                             done();
                          });
            });

            it("Should be able to get a product by name (with no access token provided)", function(done) {
               agent(url)
                     .get("/api/v1/products/" + testProduct1.name)
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('id');
                             res.body.data.should.have.property('name', testProduct1.name);
                             res.body.data.should.have.property('prettyName', testProduct1.prettyName);
                             res.body.data.should.have.property('vendor', testProduct1.vendor);
                             res.body.data.should.have.property('description', testProduct1.description);
                             res.body.data.should.have.property('creatorUserId', accessTokens.testUser1.userId);
                             should(res.body.data.defaultChannelSpecs).eql(testProduct1.defaultChannelSpecs); // deep equal
                             res.body.data.should.have.property('created');
                             res.body.data.should.have.property('modified');

                             done();
                          });
            });

            it("Should fail to get a product with a bogus name", function(done) {
               agent(url)
                     .get("/api/v1/products/" + "bogus")
                     .set({
                             Authorization : "Bearer " + accessTokens.testUser1.access_token
                          })
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.NOT_FOUND);
                             res.body.should.have.property('code', httpStatus.NOT_FOUND);
                             res.body.should.have.property('status', 'error');
                             res.body.should.have.property('data', null);

                             done();
                          });
            });

            it("Should be able to get a product by name and specify which fields to return", function(done) {
               agent(url)
                     .get("/api/v1/products/" + testProduct1.name + "?fields=id,name,defaultChannelSpecs")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('id');
                             res.body.data.should.have.property('name', testProduct1.name);
                             res.body.data.should.have.not.property('prettyName');
                             res.body.data.should.have.not.property('vendor');
                             res.body.data.should.have.not.property('description');
                             res.body.data.should.have.not.property('creatorUserId');
                             res.body.data.should.have.property('defaultChannelSpecs');
                             should(res.body.data.defaultChannelSpecs).eql(testProduct1.defaultChannelSpecs); // deep equal
                             res.body.data.should.have.not.property('created');
                             res.body.data.should.have.not.property('modified');

                             done();
                          });
            });

            it("Should be able to get a product by ID and specify which fields to return", function(done) {
               agent(url)
                     .get("/api/v1/products/" + productIds.testProduct1 + "?fields=id,name,defaultChannelSpecs")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('id');
                             res.body.data.should.have.property('name', testProduct1.name);
                             res.body.data.should.have.not.property('prettyName');
                             res.body.data.should.have.not.property('vendor');
                             res.body.data.should.have.not.property('description');
                             res.body.data.should.have.not.property('creatorUserId');
                             res.body.data.should.have.property('defaultChannelSpecs');
                             should(res.body.data.defaultChannelSpecs).eql(testProduct1.defaultChannelSpecs); // deep equal
                             res.body.data.should.have.not.property('created');
                             res.body.data.should.have.not.property('modified');

                             done();
                          });
            });

            it("Should be able to list all products", function(done) {
               agent(url)
                     .get("/api/v1/products")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 2);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(2);

                             done();
                          });
            });

            it("Should be able to find products by name", function(done) {
               agent(url)
                     .get("/api/v1/products?where=name=cattfish_v1&fields=id,name")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 1);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(1);
                             res.body.data.rows[0].should.have.property('id');
                             res.body.data.rows[0].should.have.property('name', 'cattfish_v1');
                             res.body.data.rows[0].should.not.have.property('prettyName');
                             res.body.data.rows[0].should.not.have.property('vendor');
                             res.body.data.rows[0].should.not.have.property('description');
                             res.body.data.rows[0].should.not.have.property('creatorUserId');
                             res.body.data.rows[0].should.not.have.property('defaultChannelSpecs');
                             res.body.data.rows[0].should.not.have.property('created');
                             res.body.data.rows[0].should.not.have.property('modified');

                             done();
                          });
            });

            it("Should be able to query for products and have them returned in a specified order", function(done) {
               agent(url)
                     .get("/api/v1/products?fields=id,name&orderBy=-id")
                     .end(function(err, res) {
                             if (err) {
                                return done(err);
                             }

                             res.should.have.property('status', httpStatus.OK);
                             res.body.should.have.property('code', httpStatus.OK);
                             res.body.should.have.property('status', 'success');
                             res.body.should.have.property('data');
                             res.body.data.should.have.property('totalCount', 2);
                             res.body.data.should.have.property('offset', 0);
                             res.body.data.should.have.property('limit', 100);
                             res.body.data.should.have.property('rows');
                             res.body.data.rows.should.have.length(2);

                             // make sure the IDs are in descending order
                             var previousId = null;
                             res.body.data.rows.forEach(function(product) {
                                if (previousId != null) {
                                   (product.id < previousId).should.be.true;
                                }
                                previousId = product.id;
                             });

                             done();
                          });
            });

            describe("Devices", function() {

               var deviceIds = {};

               it("Should be able to create a new device", function(done) {
                  agent(url)
                        .post("/api/v1/products/" + testProduct1.name + "/devices")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .send(testDevice1)
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.CREATED);
                                res.body.should.have.property('code', httpStatus.CREATED);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('name', testDevice1.name);
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);

                                // remember this ID
                                deviceIds.testDevice1 = res.body.data.id;

                                done();
                             });
               });

               it("Should be able to create the same device for the same product for a different user", function(done) {
                  agent(url)
                        .post("/api/v1/products/" + testProduct1.name + "/devices")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser2.access_token
                             })
                        .send(testDevice1)
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.CREATED);
                                res.body.should.have.property('code', httpStatus.CREATED);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('name', testDevice1.name);
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);

                                done();
                             });
               });

               it("Should be able to find a device by product name and serial number by the user who owns it (user 1)", function(done) {
                  agent(url)
                        .get("/api/v1/products/" + testProduct1.name + "/devices/" + testDevice1.serialNumber)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');

                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('name', testDevice1.name);
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);
                                res.body.data.should.have.property('productId', productIds.testProduct1);
                                res.body.data.should.have.property('userId', createdUsers.testUser1.id);
                                res.body.data.should.have.property('created');
                                res.body.data.should.have.property('modified');

                                done();
                             });
               });

               it("Should be able to find a device by product ID and serial number by the user who owns it (user 1)", function(done) {
                  agent(url)
                        .get("/api/v1/products/" + productIds.testProduct1 + "/devices/" + testDevice1.serialNumber + "?fields=id,name,serialNumber,productId,userId")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');

                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('name', testDevice1.name);
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);
                                res.body.data.should.have.property('productId', productIds.testProduct1);
                                res.body.data.should.have.property('userId', createdUsers.testUser1.id);
                                res.body.data.should.not.have.property('created');
                                res.body.data.should.not.have.property('modified');

                                done();
                             });
               });

               it("Should be able to find a device by product name and serial number by the user who owns it (user 2)", function(done) {
                  agent(url)
                        .get("/api/v1/products/" + testProduct1.name + "/devices/" + testDevice1.serialNumber + "?fields=id,serialNumber,productId,userId")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser2.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);
                                res.body.data.should.have.property('productId', productIds.testProduct1);
                                res.body.data.should.have.property('userId', createdUsers.testUser2.id);
                                res.body.data.should.not.have.property('name');
                                res.body.data.should.not.have.property('created');
                                res.body.data.should.not.have.property('modified');

                                done();
                             });
               });

               it("Should be able to find a device by product ID and serial number by the user who owns it (user 2)", function(done) {
                  agent(url)
                        .get("/api/v1/products/" + productIds.testProduct1 + "/devices/" + testDevice1.serialNumber)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser2.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('name', testDevice1.name);
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);
                                res.body.data.should.have.property('productId', productIds.testProduct1);
                                res.body.data.should.have.property('userId', createdUsers.testUser2.id);
                                res.body.data.should.have.property('created');
                                res.body.data.should.have.property('modified');

                                done();
                             });
               });

               it("Should be able to create some more devices for user 1 and user 2", function(done) {
                  var createDevice = function(accessToken, device, deviceKey, done) {
                     agent(url)
                           .post("/api/v1/products/" + testProduct1.name + "/devices")
                           .set({
                                   Authorization : "Bearer " + accessToken
                                })
                           .send(device)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.CREATED);
                                   res.body.should.have.property('code', httpStatus.CREATED);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('id');
                                   res.body.data.should.not.have.property('name');
                                   res.body.data.should.have.property('serialNumber', device.serialNumber);

                                   deviceIds[deviceKey] = res.body.data.id;
                                   done();
                                });
                  };

                  flow.series([
                                 function(stepDone) {
                                    createDevice(accessTokens.testUser1.access_token, testDevice2, "testDevice2", stepDone);
                                 },
                                 function(stepDone) {
                                    createDevice(accessTokens.testUser1.access_token, testDevice3, "testDevice3", stepDone);
                                 },
                                 function(stepDone) {
                                    createDevice(accessTokens.testUser2.access_token, testDevice4, "testDevice4", stepDone);
                                 }
                              ], done);
               });

               it("Should fail to find a device by product name and serial number by a user who doesn't own it", function(done) {
                  agent(url)
                        .get("/api/v1/products/" + testProduct1.name + "/devices/" + testDevice4.serialNumber)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.NOT_FOUND);
                                res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                res.body.should.have.property('status', 'error');
                                res.body.should.have.property('data');

                                done();
                             });
               });

               it("Should be able to find a device by ID by the user who owns it", function(done) {
                  agent(url)
                        .get("/api/v1/devices/" + deviceIds.testDevice4 + "?fields=id,serialNumber,userId")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser2.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('id');
                                res.body.data.should.have.property('serialNumber', testDevice4.serialNumber);
                                res.body.data.should.have.property('userId', createdUsers.testUser2.id);
                                res.body.data.should.not.have.property('name');
                                res.body.data.should.not.have.property('productId');
                                res.body.data.should.not.have.property('created');
                                res.body.data.should.not.have.property('modified');

                                done();
                             });
               });

               it("Should fail to find a device by ID by a user who doesn't own it", function(done) {
                  agent(url)
                        .get("/api/v1/devices/" + deviceIds.testDevice4 + "?fields=id,serialNumber,userId")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.FORBIDDEN);
                                res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                res.body.should.have.property('status', 'error');
                                res.body.should.have.property('data');

                                done();
                             });
               });

               it("Should be able to find all devices for a particular product owned by the auth'd user (user 1)", function(done) {
                  agent(url)
                        .get("/api/v1/devices?where=productId=" + productIds.testProduct1)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('totalCount', 3);
                                res.body.data.should.have.property('offset', 0);
                                res.body.data.should.have.property('limit', 100);
                                res.body.data.should.have.property('rows');
                                res.body.data.rows.should.have.length(3);
                                res.body.data.rows[0].should.have.property('id');
                                res.body.data.rows[0].should.have.property('name', testDevice1.name || null);
                                res.body.data.rows[0].should.have.property('serialNumber', testDevice1.serialNumber);
                                res.body.data.rows[0].should.have.property('productId', productIds.testProduct1);
                                res.body.data.rows[0].should.have.property('userId', createdUsers.testUser1.id);
                                res.body.data.rows[0].should.have.property('created');
                                res.body.data.rows[0].should.have.property('modified');
                                res.body.data.rows[1].should.have.property('id');
                                res.body.data.rows[1].should.have.property('name', testDevice2.name || null);
                                res.body.data.rows[1].should.have.property('serialNumber', testDevice2.serialNumber);
                                res.body.data.rows[1].should.have.property('productId', productIds.testProduct1);
                                res.body.data.rows[1].should.have.property('userId', createdUsers.testUser1.id);
                                res.body.data.rows[1].should.have.property('created');
                                res.body.data.rows[1].should.have.property('modified');
                                res.body.data.rows[2].should.have.property('id');
                                res.body.data.rows[2].should.have.property('name', testDevice3.name || null);
                                res.body.data.rows[2].should.have.property('serialNumber', testDevice3.serialNumber);
                                res.body.data.rows[2].should.have.property('productId', productIds.testProduct1);
                                res.body.data.rows[2].should.have.property('userId', createdUsers.testUser1.id);
                                res.body.data.rows[2].should.have.property('created');
                                res.body.data.rows[2].should.have.property('modified');

                                done();
                             });
               });

               it("Should be able to find all devices for a particular product owned by the auth'd user (user 2)", function(done) {
                  agent(url)
                        .get("/api/v1/devices?fields=id,serialNumber,userId,productId&where=productId=" + productIds.testProduct1)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser2.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('totalCount', 2);
                                res.body.data.should.have.property('offset', 0);
                                res.body.data.should.have.property('limit', 100);
                                res.body.data.should.have.property('rows');
                                res.body.data.rows.should.have.length(2);
                                res.body.data.rows[0].should.have.property('id');
                                res.body.data.rows[0].should.not.have.property('name');
                                res.body.data.rows[0].should.have.property('serialNumber', testDevice1.serialNumber);
                                res.body.data.rows[0].should.have.property('productId', productIds.testProduct1);
                                res.body.data.rows[0].should.have.property('userId', createdUsers.testUser2.id);
                                res.body.data.rows[1].should.have.property('id');
                                res.body.data.rows[1].should.not.have.property('name');
                                res.body.data.rows[1].should.have.property('serialNumber', testDevice4.serialNumber);
                                res.body.data.rows[1].should.have.property('productId', productIds.testProduct1);
                                res.body.data.rows[1].should.have.property('userId', createdUsers.testUser2.id);

                                done();
                             });
               });

               it("Should fail to find any devices for a particular product if the auth'd user (user 1) has no devices for that product", function(done) {
                  agent(url)
                        .get("/api/v1/devices?fields=id,userId,productId&where=productId=" + productIds.testProduct2)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('totalCount', 0);
                                res.body.data.should.have.property('offset', 0);
                                res.body.data.should.have.property('limit', 100);
                                res.body.data.should.have.property('rows');
                                res.body.data.rows.should.have.length(0);

                                done();
                             });
               });

               it("Should fail to find any devices for a particular product if the auth'd user (user 2) has no devices for that product", function(done) {
                  agent(url)
                        .get("/api/v1/devices?fields=id,userId,productId&where=productId=" + productIds.testProduct2)
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser2.access_token
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.OK);
                                res.body.should.have.property('code', httpStatus.OK);
                                res.body.should.have.property('status', 'success');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('totalCount', 0);
                                res.body.data.should.have.property('offset', 0);
                                res.body.data.should.have.property('limit', 100);
                                res.body.data.should.have.property('rows');
                                res.body.data.rows.should.have.length(0);

                                done();
                             });
               });

               it("Should fail to find any devices for a particular product if auth is invalid", function(done) {
                  agent(url)
                        .get("/api/v1/devices?fields=id&where=productId=" + productIds.testProduct1)
                        .set({
                                Authorization : "Bearer " + "bogus"
                             })
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.UNAUTHORIZED);

                                done();
                             });
               });

               it("Should fail to create the same device for the same product for the same user again", function(done) {
                  agent(url)
                        .post("/api/v1/products/" + testProduct1.name + "/devices")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .send(testDevice1)
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.CONFLICT);
                                res.body.should.have.property('code', httpStatus.CONFLICT);
                                res.body.should.have.property('status', 'error');
                                res.body.should.have.property('data');
                                res.body.data.should.have.property('serialNumber', testDevice1.serialNumber);

                                done();
                             });
               });

               it("Should fail to create a new device for a bogus product", function(done) {
                  agent(url)
                        .post("/api/v1/products/bogus/devices")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .send(testDevice1)
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.NOT_FOUND);
                                res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                res.body.should.have.property('status', 'error');
                                res.body.should.have.property('data', null);

                                done();
                             });
               });

               it("Should fail to create a new device if required fields are missing", function(done) {
                  var badDevice = shallowClone(testDevice1);
                  delete badDevice.serialNumber;

                  agent(url)
                        .post("/api/v1/products/" + testProduct1.name + "/devices")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .send(badDevice)
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                res.body.should.have.property('status', 'error');
                                res.body.should.have.property('data');
                                res.body.data[0].should.have.property('instanceContext', '#');
                                res.body.data[0].should.have.property('constraintName', 'required');
                                res.body.data[0].should.have.property('constraintValue', db.devices.jsonSchema.required);

                                done();
                             });
               });

               it("Should fail to create a new device if serial number is invalid", function(done) {
                  var badDevice = shallowClone(testDevice1);
                  badDevice.serialNumber = "serial number cannot have spaces";

                  agent(url)
                        .post("/api/v1/products/" + testProduct1.name + "/devices")
                        .set({
                                Authorization : "Bearer " + accessTokens.testUser1.access_token
                             })
                        .send(badDevice)
                        .end(function(err, res) {
                                if (err) {
                                   return done(err);
                                }

                                res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                res.body.should.have.property('status', 'error');
                                res.body.should.have.property('data');
                                res.body.data[0].should.have.property('instanceContext', '#/serialNumber');
                                res.body.data[0].should.have.property('constraintName', 'pattern');
                                res.body.data[0].should.have.property('kind', 'StringValidationError');
                                done();
                             });
               });

               describe("Feeds", function() {

                  var feeds = {};

                  it("Should be able to create a new feed", function(done) {
                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(testFeed1a)
                           .end(function(err, res) {
                                   if (err) {
                                      log.error(err);
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.CREATED);
                                   res.body.should.have.property('code', httpStatus.CREATED);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('id');
                                   res.body.data.should.have.property('apiKey');
                                   res.body.data.should.have.property('apiKeyReadOnly');

                                   // remember this feed
                                   feeds.testFeed1a = res.body.data;

                                   done();
                                });
                  });

                  it("Should be able to create an additional feed for a device", function(done) {
                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(testFeed1b)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.CREATED);
                                   res.body.should.have.property('code', httpStatus.CREATED);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('id');
                                   res.body.data.should.have.property('apiKey');
                                   res.body.data.should.have.property('apiKeyReadOnly');

                                   // remember this feed
                                   feeds.testFeed1b = res.body.data;

                                   done();
                                });
                  });

                  it("Should be able to get the public feeds for a device, without authorization", function(done) {
                     agent(url)
                           .get("/api/v1/feeds?where=deviceId=" + deviceIds.testDevice1)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.OK);
                                   res.body.should.have.property('code', httpStatus.OK);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('totalCount', 1);
                                   res.body.data.should.have.property('offset', 0);
                                   res.body.data.should.have.property('rows');
                                   res.body.data.rows.should.have.length(1);
                                   res.body.data.rows[0].should.have.property('name', testFeed1a.name);
                                   res.body.data.rows[0].should.have.property('deviceId', deviceIds.testDevice1);
                                   res.body.data.rows[0].should.have.property('userId', accessTokens.testUser1.userId);
                                   res.body.data.rows[0].should.have.property('exposure', testFeed1a.exposure);
                                   res.body.data.rows[0].should.have.property('isPublic', testFeed1a.isPublic);
                                   res.body.data.rows[0].should.have.property('isMobile', testFeed1a.isMobile);
                                   res.body.data.rows[0].should.have.property('latitude', testFeed1a.latitude);
                                   res.body.data.rows[0].should.have.property('longitude', testFeed1a.longitude);
                                   res.body.data.rows[0].should.have.property('channelSpecs');
                                   res.body.data.rows[0].should.have.property('created');
                                   res.body.data.rows[0].should.have.property('modified');

                                   // shouldn't get the apiKey if not auth'd
                                   res.body.data.rows[0].should.not.have.property('apiKey');

                                   // SHOULD get the apiKeyReadOnly, even if not auth'd
                                   res.body.data.rows[0].should.have.property('apiKeyReadOnly');

                                   done();
                                });
                  });

                  it("Should be able to get the public and private feeds for a device, with authorization", function(done) {
                     agent(url)
                           .get("/api/v1/feeds?where=deviceId=" + deviceIds.testDevice1)
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.OK);
                                   res.body.should.have.property('code', httpStatus.OK);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('totalCount', 2);
                                   res.body.data.should.have.property('offset', 0);
                                   res.body.data.should.have.property('rows');
                                   res.body.data.rows.should.have.length(2);
                                   res.body.data.rows[0].should.have.property('name', testFeed1a.name);
                                   res.body.data.rows[0].should.have.property('deviceId', deviceIds.testDevice1);
                                   res.body.data.rows[0].should.have.property('userId', accessTokens.testUser1.userId);
                                   res.body.data.rows[0].should.have.property('apiKey');
                                   res.body.data.rows[0].should.have.property('apiKeyReadOnly');
                                   res.body.data.rows[0].should.have.property('exposure', testFeed1a.exposure);
                                   res.body.data.rows[0].should.have.property('isPublic', testFeed1a.isPublic);
                                   res.body.data.rows[0].should.have.property('isMobile', testFeed1a.isMobile);
                                   res.body.data.rows[0].should.have.property('latitude', testFeed1a.latitude);
                                   res.body.data.rows[0].should.have.property('longitude', testFeed1a.longitude);
                                   res.body.data.rows[0].should.have.property('channelSpecs');
                                   res.body.data.rows[0].should.have.property('created');
                                   res.body.data.rows[0].should.have.property('modified');

                                   res.body.data.rows[1].should.have.property('name', testFeed1b.name);
                                   res.body.data.rows[1].should.have.property('deviceId', deviceIds.testDevice1);
                                   res.body.data.rows[1].should.have.property('userId', accessTokens.testUser1.userId);
                                   res.body.data.rows[1].should.have.property('apiKey');
                                   res.body.data.rows[1].should.have.property('apiKeyReadOnly');
                                   res.body.data.rows[1].should.have.property('exposure', testFeed1b.exposure);
                                   res.body.data.rows[1].should.have.property('isPublic', testFeed1b.isPublic);
                                   res.body.data.rows[1].should.have.property('isMobile', testFeed1b.isMobile);
                                   res.body.data.rows[1].should.have.property('latitude', testFeed1b.latitude);
                                   res.body.data.rows[1].should.have.property('longitude', testFeed1b.longitude);
                                   res.body.data.rows[1].should.have.property('channelSpecs');
                                   res.body.data.rows[1].should.have.property('created');
                                   res.body.data.rows[1].should.have.property('modified');

                                   done();
                                });
                  });

                  it("Should be able to get only the public feeds for a device, with incorrect authorization", function(done) {
                     agent(url)
                           .get("/api/v1/feeds?where=deviceId=" + deviceIds.testDevice1)
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser2.access_token
                                })
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.OK);
                                   res.body.should.have.property('code', httpStatus.OK);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('totalCount', 1);
                                   res.body.data.should.have.property('offset', 0);
                                   res.body.data.should.have.property('rows');
                                   res.body.data.rows.should.have.length(1);
                                   res.body.data.rows[0].should.have.property('name', testFeed1a.name);
                                   res.body.data.rows[0].should.have.property('deviceId', deviceIds.testDevice1);
                                   res.body.data.rows[0].should.have.property('userId', accessTokens.testUser1.userId);
                                   res.body.data.rows[0].should.have.property('exposure', testFeed1a.exposure);
                                   res.body.data.rows[0].should.have.property('isPublic', testFeed1a.isPublic);
                                   res.body.data.rows[0].should.have.property('isMobile', testFeed1a.isMobile);
                                   res.body.data.rows[0].should.have.property('latitude', testFeed1a.latitude);
                                   res.body.data.rows[0].should.have.property('longitude', testFeed1a.longitude);
                                   res.body.data.rows[0].should.have.property('channelSpecs');
                                   res.body.data.rows[0].should.have.property('created');
                                   res.body.data.rows[0].should.have.property('modified');

                                   // shouldn't get the apiKey if not auth'd
                                   res.body.data.rows[0].should.not.have.property('apiKey');

                                   // SHOULD get the apiKeyReadOnly, even if not auth'd
                                   res.body.data.rows[0].should.have.property('apiKeyReadOnly');

                                   done();
                                });
                  });

                  it("Should be able to create a new feed with a null channelSpecs (will use Product's defaultChannelSpecs)", function(done) {
                     var invalidFeed = shallowClone(testFeed1c);
                     invalidFeed.channelSpecs = null;

                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(invalidFeed)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.CREATED);
                                   res.body.should.have.property('code', httpStatus.CREATED);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('id');
                                   res.body.data.should.have.property('apiKey');
                                   res.body.data.should.have.property('apiKeyReadOnly');

                                   // now compare the channelSpecs to the product's defaultChannelSpecs.  First get the
                                   // channelSpecs from the created feed
                                   agent(url)
                                         .get("/api/v1/feeds/" + res.body.data.apiKeyReadOnly + "?fields=channelSpecs")
                                         .end(function(err, res) {
                                                 if (err) {
                                                    return done(err);
                                                 }

                                                 res.should.have.property('status', httpStatus.OK);
                                                 res.body.should.have.property('code', httpStatus.OK);
                                                 res.body.should.have.property('status', 'success');
                                                 res.body.should.have.property('data');
                                                 res.body.data.should.have.property('channelSpecs');

                                                 should(res.body.data.channelSpecs).eql(testProduct1.defaultChannelSpecs); // deep equal

                                                 done();
                                              })
                                });
                  });

                  it("Should be able to create a new feed with a custom channelSpecs (different from the Product's defaultChannelSpecs)", function(done) {

                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(testFeed1c)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.CREATED);
                                   res.body.should.have.property('code', httpStatus.CREATED);
                                   res.body.should.have.property('status', 'success');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.property('id');
                                   res.body.data.should.have.property('apiKey');
                                   res.body.data.should.have.property('apiKeyReadOnly');

                                   // now compare the actual channelSpecs to the requests channelSpecs.  First get the
                                   // channelSpecs from the created feed
                                   agent(url)
                                         .get("/api/v1/feeds/" + res.body.data.apiKeyReadOnly + "?fields=channelSpecs")
                                         .end(function(err, res) {
                                                 if (err) {
                                                    return done(err);
                                                 }

                                                 res.should.have.property('status', httpStatus.OK);
                                                 res.body.should.have.property('code', httpStatus.OK);
                                                 res.body.should.have.property('status', 'success');
                                                 res.body.should.have.property('data');
                                                 res.body.data.should.have.property('channelSpecs');

                                                 should(res.body.data.channelSpecs).eql(testFeed1c.channelSpecs); // deep equal

                                                 done();
                                              })
                                });
                  });

                  it("Should fail to create a new feed for a bogus device", function(done) {
                     agent(url)
                           .post("/api/v1/devices/bogus/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(testFeed1a)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.NOT_FOUND);
                                   res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                   res.body.should.have.property('status', 'error');
                                   res.body.should.have.property('data', null);

                                   done();
                                });
                  });

                  it("Should fail to create a new feed for a device owned by a different user", function(done) {
                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser2.access_token
                                })
                           .send(testFeed1b)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.FORBIDDEN);
                                   res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                   res.body.should.have.property('status', 'error');
                                   res.body.should.have.property('data', null);

                                   done();
                                });
                  });

                  it("Should fail to create a feed if required fields are missing", function(done) {
                     var invalidFeed = shallowClone(testFeed1b);
                     delete invalidFeed.name;
                     delete invalidFeed.exposure;

                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(invalidFeed)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                   res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                   res.body.should.have.property('status', 'error');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.length(1);
                                   res.body.data[0].should.have.property('instanceContext', '#');
                                   res.body.data[0].should.have.property('constraintName', 'required');
                                   res.body.data[0].should.have.property('constraintValue', db.feeds.jsonSchema.required);

                                   done();
                                });
                  });

                  it("Should fail to create a feed if fields are invalid", function(done) {
                     var invalidFeed = shallowClone(testFeed1b);
                     invalidFeed.name = "This is an absurdly long feed name and only a crazy person would create one this long because, seriously, what good does it do to have a name that's over 255 characters long? None, as far as I can tell, other than testing the max length of feed names, of course.";
                     invalidFeed.exposure = "outer space";
                     invalidFeed.latitude = "a";
                     invalidFeed.longitude = 4242;

                     agent(url)
                           .post("/api/v1/devices/" + deviceIds.testDevice1 + "/feeds")
                           .set({
                                   Authorization : "Bearer " + accessTokens.testUser1.access_token
                                })
                           .send(invalidFeed)
                           .end(function(err, res) {
                                   if (err) {
                                      return done(err);
                                   }

                                   res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                   res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                   res.body.should.have.property('status', 'error');
                                   res.body.should.have.property('data');
                                   res.body.data.should.have.length(4);
                                   res.body.data[0].should.have.property('instanceContext', '#/name');
                                   res.body.data[0].should.have.property('constraintName', 'maxLength');
                                   res.body.data[0].should.have.property('constraintValue', db.feeds.jsonSchema.properties.name.maxLength);
                                   res.body.data[0].should.have.property('kind', "StringValidationError");
                                   res.body.data[1].should.have.property('instanceContext', '#/exposure');
                                   res.body.data[1].should.have.property('constraintName', 'enum');
                                   res.body.data[1].should.have.property('constraintValue', db.feeds.jsonSchema.properties.exposure.enum);
                                   res.body.data[2].should.have.property('instanceContext', '#/latitude');
                                   res.body.data[2].should.have.property('constraintName', 'type');
                                   res.body.data[2].should.have.property('constraintValue', db.feeds.jsonSchema.properties.latitude.type);
                                   res.body.data[3].should.have.property('instanceContext', '#/longitude');
                                   res.body.data[3].should.have.property('constraintName', 'maximum');
                                   res.body.data[3].should.have.property('constraintValue', db.feeds.jsonSchema.properties.longitude.maximum);

                                   done();
                                });
                  });

                  describe("Upload", function() {
                     describe("To /feeds method", function() {
                        it("Should fail to upload to a feed if no authentication is provided", function(done) {
                           agent(url)
                                 .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                 .send(testFeed1aData2)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                         done();
                                      });
                        });

                        describe("OAuth2 authentication", function() {
                           it("Should be able to upload empty data to a feed using the user's OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send({})
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.property('channelBounds', {});
                                            res.body.data.should.have.property('importedBounds', {});

                                            done();
                                         });
                           });

                           it("Should be able to upload to a public feed using the user's OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.property('channelBounds');
                                            res.body.data.channelBounds.should.have.property('channels');
                                            res.body.data.channelBounds.should.have.property('minTimeSecs', testFeed1aData2.data[0][0]);
                                            res.body.data.channelBounds.should.have.property('maxTimeSecs', testFeed1aData2.data[testFeed1aData2.data.length - 1][0]);
                                            res.body.data.should.have.property('importedBounds');
                                            res.body.data.importedBounds.should.have.property('channels');
                                            res.body.data.importedBounds.should.have.property('minTimeSecs', testFeed1aData2.data[0][0]);
                                            res.body.data.importedBounds.should.have.property('maxTimeSecs', testFeed1aData2.data[testFeed1aData2.data.length - 1][0]);
                                            done();
                                         });
                           });

                           it("Should be able to upload to a private feed using the user's OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');

                                            res.body.data.should.have.property('channelBounds');
                                            res.body.data.channelBounds.should.have.property('channels');
                                            res.body.data.channelBounds.should.have.property('minTimeSecs', testFeed1aData2.data[0][0]);
                                            res.body.data.channelBounds.should.have.property('maxTimeSecs', testFeed1aData2.data[testFeed1aData2.data.length - 1][0]);
                                            res.body.data.should.have.property('importedBounds');
                                            res.body.data.importedBounds.should.have.property('channels');
                                            res.body.data.importedBounds.should.have.property('minTimeSecs', testFeed1aData2.data[0][0]);
                                            res.body.data.importedBounds.should.have.property('maxTimeSecs', testFeed1aData2.data[testFeed1aData2.data.length - 1][0]);
                                            done();
                                         });
                           });

                           it("Should be able to upload data for a single channel to a feed (this one will affect the min/max times)", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(testFeed1aData3)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');

                                            res.body.data.should.have.property('channelBounds');
                                            res.body.data.channelBounds.should.have.property('channels');
                                            res.body.data.channelBounds.should.have.property('minTimeSecs', testFeed1aData3.data[0][0]);
                                            res.body.data.channelBounds.should.have.property('maxTimeSecs', testFeed1aData3.data[testFeed1aData3.data.length - 1][0]);
                                            res.body.data.should.have.property('importedBounds');
                                            res.body.data.importedBounds.should.have.property('channels');
                                            res.body.data.importedBounds.should.have.property('minTimeSecs', testFeed1aData3.data[0][0]);
                                            res.body.data.importedBounds.should.have.property('maxTimeSecs', testFeed1aData3.data[testFeed1aData3.data.length - 1][0]);
                                            done();
                                         });
                           });

                           it("Should be able to upload data for a single channel to a feed (this one won't affect the min/max times)", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(testFeed1aData4)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');

                                            res.body.data.should.have.property('channelBounds');
                                            res.body.data.channelBounds.should.have.property('channels');
                                            res.body.data.channelBounds.should.have.property('minTimeSecs', testFeed1aData3.data[0][0]);
                                            res.body.data.channelBounds.should.have.property('maxTimeSecs', testFeed1aData3.data[testFeed1aData3.data.length - 1][0]);
                                            res.body.data.should.have.property('importedBounds');
                                            res.body.data.importedBounds.should.have.property('channels');
                                            res.body.data.importedBounds.should.have.property('minTimeSecs', testFeed1aData4.data[0][0]);
                                            res.body.data.importedBounds.should.have.property('maxTimeSecs', testFeed1aData4.data[testFeed1aData4.data.length - 1][0]);
                                            done();
                                         });
                           });

                           it("Should fail to upload to a public feed using the wrong user's OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data', null);
                                            done();
                                         });
                           });

                           it("Should fail to upload to a private feed using the wrong user's OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data', null);
                                            done();
                                         });
                           });

                           it("Should fail to upload to a feed using a valid OAuth2 access token but an invalid feed ID", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + "0")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.NOT_FOUND);
                                            res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            done();
                                         });
                           });

                           it("Should fail to upload to a public feed using an invalid OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                       Authorization : "Bearer " + "bogus"
                                    })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data', null);
                                            done();
                                         });
                           });

                           it("Should fail to upload to a public feed using no authentication", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                            res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data', null);
                                            done();
                                         });
                           });

                           it("Should fail to upload to a private feed using an invalid OAuth2 access token to authenticate", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                       Authorization : "Bearer " + "bogus"
                                    })
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data', null);
                                            done();
                                         });
                           });

                           it("Should fail to upload to a private feed using no authentication", function(done) {
                              agent(url)
                                    .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .send(testFeed1aData2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                            res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data', null);
                                            done();
                                         });
                           });

                        });   // end OAuth2 authentication

                        describe("FeedApiKey authentication", function() {

                           describe("Feed API Key in the request header", function() {
                              it("Should be able to upload empty data to a feed using the feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1a.apiKey
                                            })
                                       .send({})
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should be able to upload to a public feed using the feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1a.apiKey
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should be able to upload to a private feed using the feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1b.apiKey
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should be able to upload data for a single channel to a feed", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1a.apiKey
                                            })
                                       .send(testFeed1aData3)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should fail to upload to a public feed using the wrong feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1b.apiKey
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data', null);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a private feed using the wrong feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1a.apiKey
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data', null);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a public feed using the wrong feed's read-only apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1b.apiKeyReadOnly
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data', null);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a private feed using the wrong feed's read-only apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                       .set({
                                               FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data', null);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a feed using a valid feed apiKey but an invalid feed ID", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + "0")
                                       .set({
                                               FeedApiKey : feeds.testFeed1b.apiKey
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.NOT_FOUND);
                                               res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data');
                                               done();
                                            });
                              });

                              it("Should fail to upload to a public feed using an invalid feed apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                               FeedApiKey : "bogus"
                                            })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a private feed using an invalid feed apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                       .set({
                                          FeedApiKey : "bogus"
                                       })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a public feed using the read-only apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.id)
                                       .set({
                                          FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                       })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a private feed using the read-only apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.id)
                                       .set({
                                          FeedApiKey : feeds.testFeed1b.apiKeyReadOnly
                                       })
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               done();
                                            });
                              });
                           });      // end Feed API Key in the request header

                           describe("Feed API Key in the URL", function() {
                              it("Should be able to upload empty data to a feed using the feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.apiKey)
                                       .send({})
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should be able to upload to a public feed using the feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.apiKey)
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should be able to upload to a private feed using the feed's apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.apiKey)
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should be able to upload data for a single channel to a feed", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.apiKey)
                                       .send(testFeed1aData3)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.OK);
                                               res.body.should.have.property('code', httpStatus.OK);
                                               res.body.should.have.property('status', 'success');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should fail to upload to a feed using an invalid feed apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + "012345678901234567890123456789012345678901234567890123456789abcd")
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.NOT_FOUND);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a public feed using a read-only apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1a.apiKeyReadOnly)
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data', null);
                                               done();
                                            });
                              });

                              it("Should fail to upload to a private feed using a read-only apiKey to authenticate", function(done) {
                                 agent(url)
                                       .put("/api/v1/feeds/" + feeds.testFeed1b.apiKeyReadOnly)
                                       .send(testFeed1aData2)
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data', null);
                                               done();
                                            });
                              });
                           });     // end Feed API Key in the URL
                        });   // end FeedApiKey authentication
                     });   // end To /feeds method

                     describe("To /feed method", function() {
                        it("Should be able to upload empty data to a feed using the feed's apiKey to authenticate", function(done) {
                           agent(url)
                                 .put("/api/v1/feed")
                                 .set({
                                         FeedApiKey : feeds.testFeed1a.apiKey
                                      })
                                 .send({})
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('channelBounds', {});
                                         res.body.data.should.have.property('importedBounds', {});

                                         done();
                                      });
                        });

                        it("Should fail to upload empty data to a feed using the feed's apiKeyReadOnly to authenticate", function(done) {
                           agent(url)
                                 .put("/api/v1/feed")
                                 .set({
                                         FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                      })
                                 .send({})
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);

                                         done();
                                      });
                        });

                        it("Should be able to upload to a feed using the feed's apiKey to authenticate", function(done) {
                           agent(url)
                                 .put("/api/v1/feed")
                                 .set({
                                         FeedApiKey : feeds.testFeed1a.apiKey
                                      })
                                 .send(testFeed1aData1)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');

                                         done();
                                      });
                        });

                        it("Should fail to upload to a feed using the feed's apiKeyReadOnly to authenticate", function(done) {
                           agent(url)
                                 .put("/api/v1/feed")
                                 .set({
                                         FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                      })
                                 .send(testFeed1aData1)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);

                                         done();
                                      });
                        });

                        it("Should fail to upload to a feed using an invalid apiKey to authenticate", function(done) {
                           agent(url)
                                 .put("/api/v1/feed")
                                 .set({
                                         FeedApiKey : "bogus"
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                         done();
                                      });
                        });

                        it("Should fail to upload to a feed if no apiKey is provided", function(done) {
                           agent(url)
                                 .put("/api/v1/feed")
                                 .send(testFeed1aData2)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                         done();
                                      });
                        });

                     });   // end To /feed method

                  });      // end Upload

                  describe("Get Info", function() {
                     var channelInfoFeed1a = {
                        "channels" : {
                           "temperature" : {
                              "minTimeSecs" : 1380270001,
                              "maxTimeSecs" : 1382055042,
                              "minValue" : 14.2,
                              "maxValue" : 33.9
                           },
                           "conductivity" : {
                              "minTimeSecs" : 1380276279.1,
                              "maxTimeSecs" : 1382054188,
                              "minValue" : 464,
                              "maxValue" : 624
                           },
                           "battery_voltage" : {
                              "minTimeSecs" : 1380276279.1,
                              "maxTimeSecs" : 1382054188,
                              "minValue" : 3.84,
                              "maxValue" : 3.85
                           }
                        },
                        "minTimeSecs" : 1380270001,
                        "maxTimeSecs" : 1382055042
                     };

                     var channelInfoFeed1b = {
                        "channels" : {
                           "temperature" : {
                              "minTimeSecs" : 1381238902.42,
                              "maxTimeSecs" : 1382054188,
                              "minValue" : 17.7,
                              "maxValue" : 20.8
                           },
                           "conductivity" : {
                              "minTimeSecs" : 1381238902.42,
                              "maxTimeSecs" : 1382054188,
                              "minValue" : 478,
                              "maxValue" : 624
                           },
                           "battery_voltage" : {
                              "minTimeSecs" : 1381238902.42,
                              "maxTimeSecs" : 1382054188,
                              "minValue" : 3.84,
                              "maxValue" : 3.84
                           }
                        },
                        "minTimeSecs" : 1381238902.42,
                        "maxTimeSecs" : 1382054188
                     };

                     var validateSuccessfulInfoFetch = function(res, feedId, testFeed, channelInfo, shouldBeAllowedToSeeApiKey) {
                        res.should.have.property('status', httpStatus.OK);
                        res.body.should.have.property('code', httpStatus.OK);
                        res.body.should.have.property('status', 'success');
                        res.body.should.have.property('data');
                        res.body.data.should.have.property('id', feedId);
                        res.body.data.should.have.property('name', testFeed.name);
                        res.body.data.should.have.property('deviceId');
                        res.body.data.should.have.property('userId');
                        res.body.data.should.have.property('apiKeyReadOnly');
                        res.body.data.should.have.property('exposure', testFeed.exposure);
                        res.body.data.should.have.property('isPublic', testFeed.isPublic);
                        res.body.data.should.have.property('isMobile', testFeed.isMobile);
                        res.body.data.should.have.property('latitude', testFeed.latitude);
                        res.body.data.should.have.property('longitude', testFeed.longitude);
                        res.body.data.should.have.property('created');
                        res.body.data.should.have.property('modified');
                        res.body.data.should.have.property('lastUpload');
                        res.body.data.should.have.property('minTimeSecs');
                        res.body.data.should.have.property('maxTimeSecs');
                        should(res.body.data.channelSpecs).eql(testProduct1.defaultChannelSpecs); // deep equal
                        should(res.body.data.channelBounds).eql(channelInfo); // deep equal

                        if (shouldBeAllowedToSeeApiKey) {
                           res.body.data.should.have.property('apiKey');
                        }
                        else {
                           res.body.data.should.not.have.property('apiKey');
                        }
                     };

                     describe("OAuth2 Authentication", function() {
                        it("Should be able to get info for a public feed without authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                         done();
                                      });
                        });

                        it("Should be able to get info for a public feed with valid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser1.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, true);
                                         done();
                                      });
                        });

                        it("Should be able to get info for a public feed with valid authentication, but for the wrong user", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser2.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                         done();
                                      });
                        });

                        it("Should be able to get info for a public feed with invalid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                 .set({
                                         Authorization : "Bearer " + "bogus"
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                         done();
                                      });
                        });

                        it("Should fail to get info for a private feed without authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                         res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });

                        it("Should be able to get info for a private feed with valid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser1.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         validateSuccessfulInfoFetch(res, feeds.testFeed1b.id, testFeed1b, channelInfoFeed1b, true);
                                         done();
                                      });
                        });

                        it("Should fail to get info for a private feed with valid authentication, but for the wrong user", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser2.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });

                        it("Should fail to get info for a private feed with invalid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                 .set({
                                         Authorization : "Bearer " + "bogus"
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });

                        it("Should fail to get info for a feed with an invalid ID (valid ID plus extra non-numeric characters appended)", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id + "abc")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });
                     });      // end OAuth2 Authentication

                     describe("API Key Authentication", function() {
                        describe("Feed API Key in the request header", function() {
                           it("Should be able to get info for a public feed with valid read-write authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, true);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a public feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a public feed with valid read-write authentication, but for the wrong feed", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1b.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a public feed with valid read-only authentication, but for the wrong feed", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1b.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a private feed with valid read-write authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1b.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1b.id, testFeed1b, channelInfoFeed1b, true);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a private feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1b.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1b.id, testFeed1b, channelInfoFeed1b, false);
                                            done();
                                         });
                           });

                           it("Should fail to get info for a private feed with invalid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            FeedApiKey : "bogus"
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            done();
                                         });
                           });

                           it("Should fail to get info for a private feed with valid read-write authentication, but for the wrong feed", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            done();
                                         });
                           });

                           it("Should fail to get info for a private feed with valid read-only authentication, but for the wrong feed", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            done();
                                         });
                           });

                           it("Should fail to get info for a private feed without authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                            done();
                                         });
                           });

                        });      // end Feed API Key in the request header

                        describe("Feed API Key in the URL", function() {
                           it("Should be able to get info for a public feed with valid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.apiKey)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, true);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a public feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.apiKeyReadOnly)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1a.id, testFeed1a, channelInfoFeed1a, false);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a private feed with valid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.apiKey)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1b.id, testFeed1b, channelInfoFeed1b, true);
                                            done();
                                         });
                           });

                           it("Should be able to get info for a private feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.apiKeyReadOnly)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            validateSuccessfulInfoFetch(res, feeds.testFeed1b.id, testFeed1b, channelInfoFeed1b, false);
                                            done();
                                         });
                           });

                           it("Should fail to get info for a feed with invalid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + "012345678901234567890123456789012345678901234567890123456789abcd")
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.NOT_FOUND);
                                            done();
                                         });
                           });

                        });      // end Feed API Key in the URL
                     });      // end API Key Authentication
                  });      // end Get Info

                  describe("Get Tile", function() {
                     describe("OAuth2 Authentication", function() {

                        it("Should be able to get a tile from a public feed without authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id + "/channels/temperature/tiles/10.2633")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                         done();
                                      });
                        });

                        it("Should be able to get a tile from a public feed with valid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id + "/channels/temperature/tiles/10.2633")
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser1.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                         done();
                                      });
                        });

                        it("Should be able to get a tile from a public feed with invalid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1a.id + "/channels/temperature/tiles/10.2633")
                                 .set({
                                         Authorization : "Bearer " + "bogus"
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                         done();
                                      });
                        });

                        it("Should fail to get a tile from a private feed without authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2633")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                         res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });

                        it("Should be able to get a tile from a private feed with valid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2634")
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser1.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         should(res.body.data).eql(testFeed1bTile10_2634); // deep equal
                                         done();
                                      });
                        });

                        it("Should fail to get a tile from a private feed with valid authentication, but for the wrong user", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2634")
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser2.access_token
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });

                        it("Should fail to get a tile from a private feed with invalid authentication", function(done) {
                           agent(url)
                                 .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2634")
                                 .set({
                                         Authorization : "Bearer " + "bogus"
                                      })
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data', null);
                                         done();
                                      });
                        });

                     });      // end OAuth2 Authentication

                     describe("API Key Authentication", function() {
                        describe("Feed API Key in the request header", function() {

                           it("Should be able to get a tile from a public feed with valid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id + "/channels/temperature/tiles/10.2633")
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a public feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id + "/channels/temperature/tiles/10.2633")
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a private feed with valid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2634")
                                    .set({
                                            FeedApiKey : feeds.testFeed1b.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1bTile10_2634); // deep equal
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a private feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2634")
                                    .set({
                                            FeedApiKey : feeds.testFeed1b.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1bTile10_2634); // deep equal
                                            done();
                                         });
                           });

                           it("Should fail to get a tile from a private feed with valid read-only authentication, but for the wrong feed", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2633")
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKeyReadOnly
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            done();
                                         });
                           });

                           it("Should fail to get a tile from a private feed with valid read-write authentication, but for the wrong feed", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2633")
                                    .set({
                                            FeedApiKey : feeds.testFeed1a.apiKey
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a public feed with invalid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.id + "/channels/temperature/tiles/10.2633")
                                    .set({
                                            FeedApiKey : "bogus"
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                            done();
                                         });
                           });

                           it("Should fail to get a tile from a private feed with invalid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.id + "/channels/temperature/tiles/10.2633")
                                    .set({
                                            FeedApiKey : "bogus"
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            done();
                                         });
                           });

                        });      // end Feed API Key in the request header

                        describe("Feed API Key in the URL", function() {

                           it("Should be able to get a tile from a public feed with valid read-write authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.apiKey + "/channels/temperature/tiles/10.2633")
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a public feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1a.apiKeyReadOnly + "/channels/temperature/tiles/10.2633")
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1aTile10_2633); // deep equal
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a private feed with valid read-write authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.apiKey + "/channels/temperature/tiles/10.2634")
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1bTile10_2634); // deep equal
                                            done();
                                         });
                           });

                           it("Should be able to get a tile from a private feed with valid read-only authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + feeds.testFeed1b.apiKeyReadOnly + "/channels/temperature/tiles/10.2634")
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.OK);
                                            res.body.should.have.property('code', httpStatus.OK);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            should(res.body.data).eql(testFeed1bTile10_2634); // deep equal
                                            done();
                                         });
                           });

                           it("Should fail to get a tile with invalid authentication", function(done) {
                              agent(url)
                                    .get("/api/v1/feeds/" + "012345678901234567890123456789012345678901234567890123456789abcd" + "/channels/temperature/tiles/10.2633")
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.NOT_FOUND);
                                            done();
                                         });
                           });

                        });      // end Feed API Key in the URL
                     });      // end API Key Authentication
                  });      // end Get Tile

                  describe("Find Feeds", function() {

                     var createdFeeds = [];

                     // create some more feeds
                     before(function(initDone) {
                        var createFeed = function(deviceId, feedName, isPublic, owningUserAccessToken, callback) {
                           var feed = {
                              name : feedName,
                              exposure : "indoor",
                              isPublic : isPublic,
                              isMobile : false,
                              latitude :  40 + Math.random(),
                              longitude : -79 + Math.random()
                           };
                           agent(url)
                                 .post("/api/v1/devices/" + deviceId + "/feeds")
                                 .set({
                                         Authorization : "Bearer " + owningUserAccessToken
                                      })
                                 .send(feed)
                                 .end(function(err, res) {
                                         if (err) {
                                            return initDone(err);
                                         }

                                         res.should.have.property('status', httpStatus.CREATED);
                                         res.body.should.have.property('code', httpStatus.CREATED);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('id');
                                         res.body.data.should.have.property('apiKey');
                                         res.body.data.should.have.property('apiKeyReadOnly');

                                         feed.id = res.body.data.id;
                                         feed.apiKey = res.body.data.apiKey;
                                         feed.apiKeyReadOnly = res.body.data.apiKeyReadOnly;

                                         createdFeeds.push(feed);
                                         callback(null, feed);
                                      });

                        };

                        flow.series([
                                       function(done) {
                                          createFeed(deviceIds.testDevice3,
                                                     "Public Test Feed 1 for Device 3 owned by User 1",
                                                     true,
                                                     accessTokens.testUser1.access_token,
                                                     done);
                                       },
                                       function(done) {
                                          createFeed(deviceIds.testDevice3,
                                                     "Public Test Feed 2 for Device 3 owned by User 1",
                                                     true,
                                                     accessTokens.testUser1.access_token,
                                                     done);
                                       },
                                       function(done) {
                                          createFeed(deviceIds.testDevice4,
                                                     "Public Test Feed 1 for Device 4 owned by User 2",
                                                     true,
                                                     accessTokens.testUser2.access_token,
                                                     done);
                                       },
                                       function(done) {
                                          createFeed(deviceIds.testDevice4,
                                                     "Public Test Feed 2 for Device 4 owned by User 2",
                                                     true,
                                                     accessTokens.testUser2.access_token,
                                                     done);
                                       },
                                       function(done) {
                                          createFeed(deviceIds.testDevice4,
                                                     "Private Test Feed 1 for Device 4 owned by User 2",
                                                     false,
                                                     accessTokens.testUser2.access_token,
                                                     done);
                                       },
                                       function(done) {
                                          createFeed(deviceIds.testDevice4,
                                                     "Private Test Feed 2 for Device 4 owned by User 2",
                                                     false,
                                                     accessTokens.testUser2.access_token,
                                                     done);
                                       }
                                    ],
                                    initDone);
                     });

                     it("Should be able to find all public feeds without authentication", function(done) {
                        agent(url)
                              .get("/api/v1/feeds")
                              .end(function(err, res) {
                                      if (err) {
                                         return done(err);
                                      }

                                      res.should.have.property('status', httpStatus.OK);
                                      res.body.should.have.property('code', httpStatus.OK);
                                      res.body.should.have.property('status', 'success');
                                      res.body.should.have.property('data');
                                      res.body.data.should.have.property('totalCount', 5);
                                      res.body.data.should.have.property('offset', 0);
                                      res.body.data.should.have.property('rows');
                                      res.body.data.rows.should.have.length(5);
                                      res.body.data.rows.forEach(function(feed) {
                                         feed.should.have.property("isPublic", 1);
                                         feed.should.not.have.property("apiKey");
                                      });

                                      done();
                                   });
                     });

                     it("Should be able to apply limit and offset to found feeds", function(done) {
                        agent(url)
                              .get("/api/v1/feeds?offset=2&limit=2")
                              .end(function(err, res) {
                                      if (err) {
                                         return done(err);
                                      }

                                      res.should.have.property('status', httpStatus.OK);
                                      res.body.should.have.property('code', httpStatus.OK);
                                      res.body.should.have.property('status', 'success');
                                      res.body.should.have.property('data');
                                      res.body.data.should.have.property('totalCount', 5);
                                      res.body.data.should.have.property('offset', 2);
                                      res.body.data.should.have.property('rows');
                                      res.body.data.rows.should.have.length(2);
                                      res.body.data.rows.forEach(function(feed) {
                                         feed.should.have.property("isPublic", 1);
                                         feed.should.not.have.property("apiKey");
                                      });

                                      done();
                                   });
                     });

                     it("Should be able to order feeds based on multiple criteria", function(done) {
                        agent(url)
                              .get("/api/v1/feeds?fields=id,name,userId&orderBy=userId,-id")
                              .end(function(err, res) {
                                      if (err) {
                                         return done(err);
                                      }

                                      res.should.have.property('status', httpStatus.OK);
                                      res.body.should.have.property('code', httpStatus.OK);
                                      res.body.should.have.property('status', 'success');
                                      res.body.should.have.property('data');
                                      res.body.data.should.have.property('totalCount', 5);
                                      res.body.data.should.have.property('offset', 0);
                                      res.body.data.should.have.property('rows');
                                      res.body.data.rows.should.have.length(5);
                                      var previousFeedId = null;
                                      var previousUserId = null;
                                      res.body.data.rows.forEach(function(feed) {
                                         if (feed.userId != previousUserId) {
                                            if (previousUserId != null) {
                                               (feed.userId >= previousUserId).should.be.true;
                                            }
                                            previousFeedId = feed.id;
                                            previousUserId = feed.userId;
                                         }
                                         else {
                                            // feed IDs should be in descending order
                                            (feed.id <= previousFeedId).should.be.true;
                                            // user IDs should be in ascending order
                                            (feed.userId >= previousUserId).should.be.true;
                                         }
                                      });

                                      done();
                                   });
                     });

                     it("Should be able to find all feeds visible to user 1 with authentication", function(done) {
                        agent(url)
                              .get("/api/v1/feeds?fields=id,name,deviceId,userId,productId,isPublic,apiKey,apiKeyReadOnly")
                              .set({
                                 Authorization : "Bearer " + accessTokens.testUser1.access_token
                              })
                              .end(function(err, res) {
                                      if (err) {
                                         return done(err);
                                      }

                                      res.should.have.property('status', httpStatus.OK);
                                      res.body.should.have.property('code', httpStatus.OK);
                                      res.body.should.have.property('status', 'success');
                                      res.body.should.have.property('data');

                                      res.body.data.should.have.property('totalCount', 8);
                                      res.body.data.should.have.property('offset', 0);
                                      res.body.data.should.have.property('rows');
                                      res.body.data.rows.should.have.length(8);

                                      // remember the found feeds so we do the extra test below
                                      var foundFeedsById = {};

                                      res.body.data.rows.forEach(function(feed) {
                                         foundFeedsById[feed.id] = feed;

                                         var isOwnedByUser = feed.userId == accessTokens.testUser1.userId;

                                         // should only return feeds that are owned by the user or are public
                                         (isOwnedByUser || feed.isPublic == 1).should.be.true;

                                         // we should only get the apiKey if owned by the user.
                                         if (isOwnedByUser) {
                                            feed.should.have.property('apiKey');
                                         }
                                         else {
                                            feed.should.not.have.property('apiKey');
                                         }
                                         feed.should.have.property('apiKeyReadOnly');
                                      });

                                      // Now try again, but only selecting the id and the apiKey.  We should only get the API key for feeds that user 1 owns
                                      // This is to test a fix for a bug in the Feeds model which prevented selection of the apiKey if you didn't also select
                                      // the userId
                                      agent(url)
                                            .get("/api/v1/feeds?fields=id,apiKey")
                                            .set({
                                               Authorization : "Bearer " + accessTokens.testUser1.access_token
                                            })
                                            .end(function(err, res) {
                                                    if (err) {
                                                       return done(err);
                                                    }

                                                    res.should.have.property('status', httpStatus.OK);
                                                    res.body.should.have.property('code', httpStatus.OK);
                                                    res.body.should.have.property('status', 'success');
                                                    res.body.should.have.property('data');

                                                    res.body.data.should.have.property('totalCount', 8);
                                                    res.body.data.should.have.property('offset', 0);
                                                    res.body.data.should.have.property('rows');
                                                    res.body.data.rows.should.have.length(8);

                                                    // now check each returned feed and make sure we're only getting the apiKey for feeds owned by this user
                                                    res.body.data.rows.forEach(function(feed) {

                                                       // we should get the feed ID
                                                       feed.should.have.property('id');

                                                       // we didn't ask for the userId, so we shouldn't get it
                                                       feed.should.not.have.property('userId');

                                                       var isOwnedByUser = foundFeedsById[feed.id].userId == accessTokens.testUser1.userId;

                                                       // should only return feeds that are owned by the user or are public
                                                       (isOwnedByUser || foundFeedsById[feed.id].isPublic == 1).should.be.true;

                                                       // we should only get the apiKey if owned by the user.
                                                       if (isOwnedByUser) {
                                                          feed.should.have.property('apiKey');
                                                       }
                                                       else {
                                                          feed.should.not.have.property('apiKey');
                                                       }
                                                    });

                                                    done();
                                                 });
                                   });
                     });

                     it("Querying for private feeds should only return feeds owned by the authenticated user", function(done) {
                        agent(url)
                              .get("/api/v1/feeds?fields=id,name,deviceId,userId,productId,isPublic,apiKey,apiKeyReadOnly&where=isPublic=false")
                              .set({
                                      Authorization : "Bearer " + accessTokens.testUser2.access_token
                                   })
                              .end(function(err, res) {
                                      if (err) {
                                         return done(err);
                                      }

                                      res.should.have.property('status', httpStatus.OK);
                                      res.body.should.have.property('code', httpStatus.OK);
                                      res.body.should.have.property('status', 'success');
                                      res.body.should.have.property('data');

                                      res.body.data.should.have.property('totalCount', 2);
                                      res.body.data.should.have.property('offset', 0);
                                      res.body.data.should.have.property('rows');
                                      res.body.data.rows.should.have.length(2);
                                      res.body.data.rows.forEach(function(feed) {
                                         feed.should.have.property('userId', accessTokens.testUser2.userId);
                                         feed.should.have.property('isPublic', 0);
                                         feed.should.have.property('apiKey');
                                         feed.should.have.property('apiKeyReadOnly');
                                      });
                                      done();
                                   });
                     });

                     it("Querying for private feeds should return nothing if unauthenticated", function(done) {
                        agent(url)
                              .get("/api/v1/feeds?fields=id,name,deviceId,userId,productId,isPublic,apiKey,apiKeyReadOnly&where=isPublic=false")
                              .end(function(err, res) {
                                      if (err) {
                                         return done(err);
                                      }

                                      res.should.have.property('status', httpStatus.OK);
                                      res.body.should.have.property('code', httpStatus.OK);
                                      res.body.should.have.property('status', 'success');
                                      res.body.should.have.property('data');

                                      res.body.data.should.have.property('totalCount', 0);
                                      res.body.data.should.have.property('offset', 0);
                                      res.body.data.should.have.property('rows');
                                      res.body.data.rows.should.have.length(0);

                                      done();
                                   });
                     });

                  });      // END Find Feeds

                  describe("Export", function() {
                     var userId = 3;
                     var deviceName = "speck";
                     var createdFeeds = [];

                     before(function(initDone) {

                        var createFeed = function(deviceId, feed, callback) {
                           agent(url)
                                 .post("/api/v1/devices/" + deviceId + "/feeds")
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser1.access_token
                                      })
                                 .send(feed)
                                 .end(function(err, res) {
                                         if (err) {
                                            return initDone(err);
                                         }

                                         res.should.have.property('status', httpStatus.CREATED);
                                         res.body.should.have.property('code', httpStatus.CREATED);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('id');
                                         res.body.data.should.have.property('apiKey');
                                         res.body.data.should.have.property('apiKeyReadOnly');

                                         feed.id = res.body.data.id;
                                         feed.userId = createdUsers.testUser1.id;
                                         feed.apiKey = res.body.data.apiKey;
                                         feed.apiKeyReadOnly = res.body.data.apiKeyReadOnly;

                                         createdFeeds.push(feed);
                                         callback(null, feed);
                                      });

                        };

                        var uploadData = function(feedId, feedData, callback) {
                           agent(url)
                                 .put("/api/v1/feeds/" + feedId)
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser1.access_token
                                      })
                                 .send(feedData)
                                 .end(function(err, res) {
                                         if (err) {
                                            return initDone(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('channelBounds');
                                         res.body.data.channelBounds.should.have.property('channels');
                                         res.body.data.should.have.property('importedBounds');
                                         res.body.data.importedBounds.should.have.property('channels');
                                         callback(null, true);
                                      });
                        };

                        flow.series([
                                       function(done) {
                                          createFeed(deviceIds.testDevice1, testFeed2a, done);
                                       },
                                       function(done) {
                                          createFeed(deviceIds.testDevice1, testFeed2b, done);
                                       },
                                       function(done) {
                                          uploadData(testFeed2a.id, testFeed2aData, done);
                                       },
                                       function(done) {
                                          uploadData(testFeed2b.id, testFeed2bData, done);
                                       }
                                    ],
                                    initDone);
                     });

                     describe("Public Feeds", function() {
                        it("Should be able to export a public feed without authentication", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982815,38,7.1,\n" +
                                               "1414982833,38,11.9,\n" +
                                               "1414982875,39,6.9,\n" +
                                               "1414982893,38,101.9,\"This value is too high\"\n" +
                                               "1414982935,38,7.2,\n" +
                                               "1414982953,38,11.4,\n" +
                                               "1414985704,41,4.2,\n" +
                                               "1414985719,0,0,\"Why are these zero?\"\n" +
                                               "1414985764,38,11.3,\n" +
                                               "1414985779,39,7.5,\n"
                                         );

                                         done();
                                      });
                        });

                        it("Should ignore redundant channels", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,humidity,particle_concentration,annotation,humidity,particle_concentration/export")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982815,38,7.1,\n" +
                                               "1414982833,38,11.9,\n" +
                                               "1414982875,39,6.9,\n" +
                                               "1414982893,38,101.9,\"This value is too high\"\n" +
                                               "1414982935,38,7.2,\n" +
                                               "1414982953,38,11.4,\n" +
                                               "1414985704,41,4.2,\n" +
                                               "1414985719,0,0,\"Why are these zero?\"\n" +
                                               "1414985764,38,11.3,\n" +
                                               "1414985779,39,7.5,\n"
                                         );

                                         done();
                                      });
                        });

                        it("Should ignore invalid min and max times", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,humidity,particle_concentration,annotation,humidity,particle_concentration/export?from=foo&to=bar")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982815,38,7.1,\n" +
                                               "1414982833,38,11.9,\n" +
                                               "1414982875,39,6.9,\n" +
                                               "1414982893,38,101.9,\"This value is too high\"\n" +
                                               "1414982935,38,7.2,\n" +
                                               "1414982953,38,11.4,\n" +
                                               "1414985704,41,4.2,\n" +
                                               "1414985719,0,0,\"Why are these zero?\"\n" +
                                               "1414985764,38,11.3,\n" +
                                               "1414985779,39,7.5,\n"
                                         );

                                         done();
                                      });
                        });

                        it("Should fail to export a non-existent feed", function(done) {

                           agent(url)
                                 .get("/api/v1/feeds/-1/channels/humidity,particle_concentration,annotation/export")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');

                                         done();
                                      });
                        });

                        it("Should be able to export and limit returned records by max time", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           var maxTime = 1414982935;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export?to=" + maxTime)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '_to_time_' + maxTime + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982815,38,7.1,\n" +
                                               "1414982833,38,11.9,\n" +
                                               "1414982875,39,6.9,\n" +
                                               "1414982893,38,101.9,\"This value is too high\"\n" +
                                               "1414982935,38,7.2,\n"
                                         );

                                         done();
                                      });
                        });

                        it("Should be able to export and limit returned records by min time", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           var minTime = 1414982935;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export?from=" + minTime)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '_from_time_' + minTime + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982935,38,7.2,\n" +
                                               "1414982953,38,11.4,\n" +
                                               "1414985704,41,4.2,\n" +
                                               "1414985719,0,0,\"Why are these zero?\"\n" +
                                               "1414985764,38,11.3,\n" +
                                               "1414985779,39,7.5,\n"
                                         );

                                         done();
                                      });
                        });

                        it("Should be able to export and limit returned records by min and max time", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           var minTime = 1414982935;
                           var maxTime = 1414982953;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export?from=" + minTime + "&to=" + maxTime)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '_from_time_' + minTime + '_to_' + maxTime + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982935,38,7.2,\n" +
                                               "1414982953,38,11.4,\n"
                                         );

                                         done();
                                      });
                        });

                        it("Should be able to export and limit returned records by min and max time, even if min and max time values are swapped", function(done) {

                           var feedId = createdFeeds[0].id;
                           var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                           var minTime = 1414982935;
                           var maxTime = 1414982953;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export?from=" + maxTime + "&to=" + minTime)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '_from_time_' + minTime + '_to_' + maxTime + '.csv\"');
                                         res.should.have.property('status', httpStatus.OK);
                                         res.text.should.equal(
                                               "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                               "1414982935,38,7.2,\n" +
                                               "1414982953,38,11.4,\n"
                                         );

                                         done();
                                      });
                        });

                     });      // end Public Feeds

                     describe("Private Feeds", function() {
                        it("Should fail to export a private feed without authentication", function(done) {

                           var feedId = createdFeeds[1].id;
                           agent(url)
                                 .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                         res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');

                                         done();
                                      });
                        });

                        describe("OAuth2 Authentication", function() {

                           it("Should be able to export a private feed with valid authentication", function(done) {

                              var feedId = createdFeeds[1].id;
                              var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                              agent(url)
                                    .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                            res.should.have.property('status', httpStatus.OK);
                                            res.text.should.equal(
                                                  "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                                  "1414986064,35,22.6,\n" +
                                                  "1414986079,34,20.1,\n" +
                                                  "1414986124,34,22.8,\"Bad smell today!\"\n" +
                                                  "1414986139,35,19.5,\n" +
                                                  "1414986184,34,22.5,\n" +
                                                  "1414986199,34,18.8,\n" +
                                                  "1414986244,35,21.7,\n" +
                                                  "1414986259,34,19.8,\n" +
                                                  "1414986304,34,22.9,\n" +
                                                  "1414986319,34,19.5,\n"
                                            );

                                            done();
                                         });
                           });

                           it("Should fail to export a private feed with valid authentication, but for the wrong user", function(done) {

                              var feedId = createdFeeds[1].id;
                              agent(url)
                                    .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                    .set({
                                         Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');

                                            done();
                                         });
                           });

                           it("Should fail to export a private feed with invalid authentication", function(done) {

                              var feedId = createdFeeds[1].id;
                              agent(url)
                                    .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                    .set({
                                            Authorization : "Bearer " + "bogus"
                                         })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');

                                            done();
                                         });
                           });

                        });      // end OAuth2 Authentication

                        describe("API Key Authentication", function() {
                           describe("Feed API Key in the request header", function() {

                              it("Should be able to export a private feed with valid read-write authentication", function(done) {

                                 var feedId = createdFeeds[1].id;
                                 var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                                 agent(url)
                                       .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                       .set({
                                               FeedApiKey : createdFeeds[1].apiKey
                                            })
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                               res.should.have.property('status', httpStatus.OK);
                                               res.text.should.equal(
                                                     "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                                     "1414986064,35,22.6,\n" +
                                                     "1414986079,34,20.1,\n" +
                                                     "1414986124,34,22.8,\"Bad smell today!\"\n" +
                                                     "1414986139,35,19.5,\n" +
                                                     "1414986184,34,22.5,\n" +
                                                     "1414986199,34,18.8,\n" +
                                                     "1414986244,35,21.7,\n" +
                                                     "1414986259,34,19.8,\n" +
                                                     "1414986304,34,22.9,\n" +
                                                     "1414986319,34,19.5,\n"
                                               );

                                               done();
                                            });
                              });

                              it("Should be able to export a private feed with valid read-only authentication", function(done) {

                                 var feedId = createdFeeds[1].id;
                                 var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                                 agent(url)
                                       .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                       .set({
                                               FeedApiKey : createdFeeds[1].apiKeyReadOnly
                                            })
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                               res.should.have.property('status', httpStatus.OK);
                                               res.text.should.equal(
                                                     "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                                     "1414986064,35,22.6,\n" +
                                                     "1414986079,34,20.1,\n" +
                                                     "1414986124,34,22.8,\"Bad smell today!\"\n" +
                                                     "1414986139,35,19.5,\n" +
                                                     "1414986184,34,22.5,\n" +
                                                     "1414986199,34,18.8,\n" +
                                                     "1414986244,35,21.7,\n" +
                                                     "1414986259,34,19.8,\n" +
                                                     "1414986304,34,22.9,\n" +
                                                     "1414986319,34,19.5,\n"
                                               );

                                               done();
                                            });
                              });

                              it("Should fail to export a private feed with invalid authentication", function(done) {

                                 var feedId = createdFeeds[1].id;
                                 agent(url)
                                       .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                       .set({
                                               FeedApiKey : "bogus"
                                            })
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('code', httpStatus.FORBIDDEN);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                              it("Should fail to export a private feed with no authentication", function(done) {

                                 var feedId = createdFeeds[1].id;
                                 agent(url)
                                       .get("/api/v1/feeds/" + feedId + "/channels/humidity,particle_concentration,annotation/export")
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.UNAUTHORIZED);
                                               res.body.should.have.property('code', httpStatus.UNAUTHORIZED);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                           });      // end Feed API Key in the request header

                           describe("Feed API Key in the URL", function() {

                              it("Should be able to export a private feed with valid read-write authentication", function(done) {

                                 var feedId = createdFeeds[1].id;
                                 var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                                 agent(url)
                                       .get("/api/v1/feeds/" + createdFeeds[1].apiKey + "/channels/humidity,particle_concentration,annotation/export")
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                               res.should.have.property('status', httpStatus.OK);
                                               res.text.should.equal(
                                                     "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                                     "1414986064,35,22.6,\n" +
                                                     "1414986079,34,20.1,\n" +
                                                     "1414986124,34,22.8,\"Bad smell today!\"\n" +
                                                     "1414986139,35,19.5,\n" +
                                                     "1414986184,34,22.5,\n" +
                                                     "1414986199,34,18.8,\n" +
                                                     "1414986244,35,21.7,\n" +
                                                     "1414986259,34,19.8,\n" +
                                                     "1414986304,34,22.9,\n" +
                                                     "1414986319,34,19.5,\n"
                                               );

                                               done();
                                            });
                              });

                              it("Should be able to export a private feed with valid read-only authentication", function(done) {

                                 var feedId = createdFeeds[1].id;
                                 var feedPrefix = createdFeeds[0].userId + ".feed_" + feedId;
                                 agent(url)
                                       .get("/api/v1/feeds/" + createdFeeds[1].apiKeyReadOnly + "/channels/humidity,particle_concentration,annotation/export")
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.headers.should.have.property('content-disposition', 'attachment; filename=\"export_of_feed_' + feedId + '.csv\"');
                                               res.should.have.property('status', httpStatus.OK);
                                               res.text.should.equal(
                                                     "EpochTime," + feedPrefix + ".humidity," + feedPrefix + ".particle_concentration," + feedPrefix + ".annotation\n" +
                                                     "1414986064,35,22.6,\n" +
                                                     "1414986079,34,20.1,\n" +
                                                     "1414986124,34,22.8,\"Bad smell today!\"\n" +
                                                     "1414986139,35,19.5,\n" +
                                                     "1414986184,34,22.5,\n" +
                                                     "1414986199,34,18.8,\n" +
                                                     "1414986244,35,21.7,\n" +
                                                     "1414986259,34,19.8,\n" +
                                                     "1414986304,34,22.9,\n" +
                                                     "1414986319,34,19.5,\n"
                                               );

                                               done();
                                            });
                              });

                              it("Should fail to export a private feed with invalid authentication", function(done) {

                                 agent(url)
                                       .get("/api/v1/feeds/" + "012345678901234567890123456789012345678901234567890123456789abcd" + "/channels/humidity,particle_concentration,annotation/export")
                                       .end(function(err, res) {
                                               if (err) {
                                                  return done(err);
                                               }

                                               res.should.have.property('status', httpStatus.NOT_FOUND);
                                               res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                               res.body.should.have.property('status', 'error');
                                               res.body.should.have.property('data');

                                               done();
                                            });
                              });

                           });      // end Feed API Key in the URL
                        });      // end API Key Authentication
                     });      // end Private Feeds
                  });      // end Export

                  describe("Multifeeds", function() {
                     describe("Create", function() {
                        describe("Invalid Auth", function() {
                           it("Should fail to create a multifeed if no authentication is provided", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .send(multifeed1)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNAUTHORIZED);

                                            done();
                                         });
                           });

                           it("Should fail to create a multifeed if invalid authentication is provided", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + "bogus"
                                         })
                                    .send(multifeed1)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNAUTHORIZED);

                                            done();
                                         });
                           });
                        });     // end Invalid Auth

                        describe("Valid Auth", function() {
                           var name1 = null;
                           it("Should be able to create a multifeed with no name specified", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(multifeed1)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.CREATED);
                                            res.body.should.have.property('code', httpStatus.CREATED);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.property('id');
                                            res.body.data.should.have.property('name');

                                            // remember the name so we can compare with the 2nd invocation below
                                            name1 = res.body.data.name;

                                            done();
                                         });
                           });

                           it("Should be able to create the same multifeed again with no name specified", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(multifeed1)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.CREATED);
                                            res.body.should.have.property('code', httpStatus.CREATED);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.property('id');
                                            res.body.data.should.have.property('name');

                                            // the names should be different
                                            res.body.data.name.should.not.equal(name1);

                                            done();
                                         });
                           });

                           it("Should be able to create a named multifeed", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send(multifeed2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.CREATED);
                                            res.body.should.have.property('code', httpStatus.CREATED);
                                            res.body.should.have.property('status', 'success');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.property('id');
                                            res.body.data.should.have.property('name');

                                            done();
                                         });
                           });

                           it("Should fail to create a named multifeed again, by the same user", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send(multifeed2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.CONFLICT);
                                            res.body.should.have.property('code', httpStatus.CONFLICT);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');

                                            done();
                                         });
                           });

                           it("Should fail to create a named multifeed again, by a different user", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser1.access_token
                                         })
                                    .send(multifeed2)
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.CONFLICT);
                                            res.body.should.have.property('code', httpStatus.CONFLICT);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with no spec field specified", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({})
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'type');
                                            res.body.data[0].should.have.property('constraintValue', 'array');
                                            res.body.data[0].should.have.property('testedValue', 'undefined');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with an empty array of specs specified", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : [] })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'minItems');
                                            res.body.data[0].should.have.property('constraintValue', 1);
                                            res.body.data[0].should.have.property('testedValue', 0);

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with an empty array of specs specified", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : "bogus" })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'type');
                                            res.body.data[0].should.have.property('constraintValue', 'array');
                                            res.body.data[0].should.have.property('testedValue', 'string');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with the spec array containing a single empty object", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : [{}] })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with the spec array containing an object with feeds and channels fields of the wrong type", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : [{ feeds : 4, channels : 42 }] })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(2);
                                            res.body.data[0].should.have.property('constraintName', 'type');
                                            res.body.data[0].should.have.property('constraintValue', 'string');
                                            res.body.data[0].should.have.property('testedValue', 'integer');
                                            res.body.data[1].should.have.property('constraintName', 'type');
                                            res.body.data[1].should.have.property('constraintValue', 'array');
                                            res.body.data[1].should.have.property('testedValue', 'integer');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with the spec array containing an object with only the feeds field", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : [{ feeds : "where=outdoor=1,productId=42" }] })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'required');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with the spec array containing an object with only the channels field", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : [{ channels : ["particle_concentration", "humidity"] }] })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'required');

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with if the channels array is empty", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({ spec : [{ feeds : "where=outdoor=1,productId=42", channels : [] }] })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'minItems');
                                            res.body.data[0].should.have.property('constraintValue', 1);
                                            res.body.data[0].should.have.property('testedValue', 0);

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with if the channels array contains an empty string", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({
                                             spec : [{
                                                        feeds : "where=outdoor=1,productId=42",
                                                        channels : ["humidity", ""]
                                                     }]
                                          })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'minLength');
                                            res.body.data[0].should.have.property('constraintValue', 1);
                                            res.body.data[0].should.have.property('testedValue', 0);

                                            done();
                                         });
                           });

                           it("Should fail to create multifeed with if the channels array contains multiple instances of the same string", function(done) {
                              agent(url)
                                    .post("/api/v1/multifeeds")
                                    .set({
                                            Authorization : "Bearer " + accessTokens.testUser2.access_token
                                         })
                                    .send({
                                             spec : [{
                                                        feeds : "where=outdoor=1,productId=42",
                                                        channels : ["humidity", "particle_concentration", "humidity"]
                                                     }]
                                          })
                                    .end(function(err, res) {
                                            if (err) {
                                               return done(err);
                                            }

                                            res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                            res.body.should.have.property('status', 'error');
                                            res.body.should.have.property('data');
                                            res.body.data.should.have.length(1);
                                            res.body.data[0].should.have.property('constraintName', 'uniqueItems');
                                            res.body.data[0].should.have.property('constraintValue', true);

                                            done();
                                         });
                           });

                        });     // end Valid Auth
                     });      // end Create

                     var foundMultifeeds = null;
                     describe("Find Multifeeds", function() {
                        it("Should be able to find all multifeeds", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('totalCount', 3);
                                         res.body.data.should.have.property('rows');
                                         res.body.data.rows.should.have.length(3);

                                         foundMultifeeds = res.body.data.rows;

                                         done();
                                      });
                        });

                        it("Should be able to find all multifeeds owned by a specific user", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds?where=userId=" + createdUsers.testUser2.id)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('totalCount', 1);
                                         res.body.data.should.have.property('rows');
                                         res.body.data.rows.should.have.length(1);
                                         res.body.data.rows[0].should.have.property('userId', createdUsers.testUser2.id);

                                         done();
                                      });
                        });

                        it("Should be able to filter returned multifeeds", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds?fields=id,name&orderBy=-id&where=userId=" + createdUsers.testUser1.id)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('totalCount', 2);
                                         res.body.data.should.have.property('rows');
                                         res.body.data.rows.should.have.length(2);
                                         res.body.data.rows.forEach(function(row) {
                                            row.should.have.property('id');
                                            row.should.have.property('name');
                                            row.should.not.have.property('spec');
                                            row.should.not.have.property('querySpec');
                                            row.should.not.have.property('created');
                                            row.should.not.have.property('modified');
                                         });
                                         (res.body.data.rows[0].id > res.body.data.rows[1].id).should.be.true;

                                         done();
                                      });
                        });
                     });      // end Find Multifeeds
                     describe("Find Single Multifeed", function() {
                        it("Should be able to find a multifeed by id", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/" + foundMultifeeds[0].id)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');

                                         // deep equal
                                         should(foundMultifeeds[0]).eql(res.body.data);

                                         done();
                                      });
                        });

                        it("Should be able to find a multifeed by name", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/" + foundMultifeeds[0].name)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');

                                         // deep equal
                                         should(foundMultifeeds[0]).eql(res.body.data);

                                         done();
                                      });
                        });

                        it("Should be able to find a multifeed and filter returned fields", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/" + foundMultifeeds[0].name + "?fields=id,userId")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('id', foundMultifeeds[0].id);
                                         res.body.data.should.have.property('userId', foundMultifeeds[0].userId);

                                         done();
                                      });
                        });

                        it("Should fail to find a multifeed with a bogus ID", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/" + 0)
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');

                                         done();
                                      });
                        });

                        it("Should fail to find a multifeed with a bogus name", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/" + "bogus")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');

                                         done();
                                      });
                        });
                     });      // end Find Single Multifeed

                     describe("Find feeds described by a multifeed", function() {
                        it("Should be able to get (outdoor exposure) feeds described by a multifeed", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/" + foundMultifeeds[0].id + "/feeds?fields=id,name,exposure&orderBy=-id")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         res.body.should.have.property('code', httpStatus.OK);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');

                                         var multifeedResults = res.body.data;

                                         // compare with the results from doing a feed selection--should be the same!
                                         agent(url)
                                               .get("/api/v1/feeds?fields=id,name,exposure&where=exposure=outdoor&orderBy=-id")
                                               .end(function(err, res) {
                                                       if (err) {
                                                          return done(err);
                                                       }

                                                       res.should.have.property('status', httpStatus.OK);
                                                       res.body.should.have.property('code', httpStatus.OK);
                                                       res.body.should.have.property('status', 'success');
                                                       res.body.should.have.property('data');

                                                       // deep equal
                                                       should(res.body.data).eql(multifeedResults);

                                                       done();
                                                    });
                                      });
                        });
                     });      // end Find feeds described by a multifeed

                     describe("Get Multifeed Tiles", function() {
                        before(function(initDone) {

                           // create another multifeed named "Outdoor_Temperature_Feeds"
                           agent(url)
                                 .post("/api/v1/multifeeds")
                                 .set({
                                         Authorization : "Bearer " + accessTokens.testUser2.access_token
                                      })
                                 .send({
                                          "name" : "Outdoor_Temperature_Feeds",
                                          "spec" : [
                                             {
                                                "feeds" : "whereOr=exposure=outdoor",
                                                "channels" : ["temperature", "humidity"]
                                             }
                                          ]
                                       })
                                 .end(function(err, res) {
                                         if (err) {
                                            return initDone(err);
                                         }

                                         res.should.have.property('status', httpStatus.CREATED);
                                         res.body.should.have.property('code', httpStatus.CREATED);
                                         res.body.should.have.property('status', 'success');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('id');
                                         res.body.data.should.have.property('name');

                                         initDone();
                                      });

                        });

                        it("Should be able to fetch the tiles for a multifeed", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/Outdoor_Temperature_Feeds/tiles/18.10")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.OK);
                                         should(res.body.data).eql(require('./multifeed_tiles_1.json'));
                                         done();
                                      });
                        });
                        it("Should fail to fetch the tiles for a multifeed with an invalid level", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/Outdoor_Temperature_Feeds/tiles/foo.10")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                         res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('level');
                                         done();
                                      });
                        });
                        it("Should fail to fetch the tiles for a multifeed with an invalid offset", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/Outdoor_Temperature_Feeds/tiles/18.foo")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.UNPROCESSABLE_ENTITY);
                                         res.body.should.have.property('code', httpStatus.UNPROCESSABLE_ENTITY);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');
                                         res.body.data.should.have.property('offset');
                                         done();
                                      });
                        });
                        it("Should fail to fetch the tiles for an known multifeed", function(done) {
                           agent(url)
                                 .get("/api/v1/multifeeds/Bogus/tiles/18.10")
                                 .end(function(err, res) {
                                         if (err) {
                                            return done(err);
                                         }

                                         res.should.have.property('status', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('code', httpStatus.NOT_FOUND);
                                         res.body.should.have.property('status', 'error');
                                         res.body.should.have.property('data');
                                         done();
                                      });
                        });

                     });      // end Get Multifeed Tiles
                  });      // end Multifeeds
               });      // end Feeds
            });      // end Devices
         });      // end Products
      });      // end Products, Devices, and Feeds
   });      // end REST API

   describe("OAuth 2.0", function() {
      var tokens = null;
      var newTokens = null;

      it("Should fail to request access and refresh tokens for an unverified user", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "password",
                        client_id : testClient.clientName,
                        client_secret : testClient.clientSecret,
                        username : testUser3.email,
                        password : testUser3.password
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.FORBIDDEN);
                       res.body.should.have.property('error', 'invalid_grant');

                       done();
                    });
      });

      it("Should be able to request access and refresh tokens after verifying the user", function(done) {
         agent(url)
               .put("/api/v1/user-verification")
               .send({ token : verificationTokens.testUser3 })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.OK);
                       res.body.should.have.property('code', httpStatus.OK);
                       res.body.should.have.property('status', 'success');
                       res.body.should.have.property('data');
                       res.body.data.should.have.property('isVerified', true);

                       // now that the user is verified, request access and refresh tokens
                       agent(url)
                             .post("/oauth/token")
                             .send({
                                      grant_type : "password",
                                      client_id : testClient.clientName,
                                      client_secret : testClient.clientSecret,
                                      username : testUser1.email,
                                      password : testUser1.password
                                   })
                             .end(function(err, res) {
                                     if (err) {
                                        return done(err);
                                     }

                                     res.should.have.property('status', httpStatus.OK);
                                     res.body.should.have.property('access_token');
                                     res.body.should.have.property('refresh_token');
                                     res.body.should.have.property('expires_in', config.get("security:tokenLifeSecs"));
                                     res.body.should.have.property('token_type', "Bearer");

                                     // remember these tokens
                                     tokens = res.body;

                                     done();
                                  });
                    });
      });

      it("Should be able to request access and refresh tokens using Basic auth for the client ID and secret", function(done) {
         agent(url)
               .post("/oauth/token")
               .auth(testClient.clientName, testClient.clientSecret)
               .send({
                        grant_type : "password",
                        username : testUser1.email,
                        password : testUser1.password
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.OK);
                       res.body.should.have.property('access_token');
                       res.body.should.have.property('refresh_token');
                       res.body.should.have.property('expires_in', config.get("security:tokenLifeSecs"));
                       res.body.should.have.property('token_type', "Bearer");

                       // remember these tokens
                       tokens = res.body;

                       done();
                    });
      });

      it("Should not be able to request access and refresh tokens with an invalid client ID", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "password",
                        client_id : "bogus",
                        client_secret : testClient.clientSecret,
                        username : testUser1.email,
                        password : testUser1.password
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);

                       done();
                    });
      });

      it("Should not be able to request access and refresh tokens with an invalid client secret", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "password",
                        client_id : testClient.clientName,
                        client_secret : "bogus",
                        username : testUser1.email,
                        password : testUser1.password
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);

                       done();
                    });
      });

      it("Should not be able to request access and refresh tokens with an invalid email (username)", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "password",
                        client_id : testClient.clientName,
                        client_secret : testClient.clientSecret,
                        username : "bogus",
                        password : testUser1.password
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.FORBIDDEN);

                       done();
                    });
      });

      it("Should not be able to request access and refresh tokens with an invalid password", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "password",
                        client_id : testClient.clientName,
                        client_secret : testClient.clientSecret,
                        username : testUser1.email,
                        password : "bogus"
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.FORBIDDEN);

                       done();
                    });
      });

      it("Should be able to access a protected resource with the access token", function(done) {
         agent(url)
               .get("/api/v1/users/" + createdUsers.testUser1.id)
               .set({
                       Authorization : "Bearer " + tokens.access_token
                    })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.OK);
                       done();
                    });
      });

      it("Should not be able to access a protected resource without the access token", function(done) {
         agent(url)
               .get("/api/v1/users/" + createdUsers.testUser1.id)
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);

                       done();
                    });
      });

      it("Should not be able to access a protected resource with an invalid access token", function(done) {
         agent(url)
               .get("/api/v1/users/" + createdUsers.testUser1.id)
               .set({
                       Authorization : "Bearer bogus"
                    })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);

                       done();
                    });
      });

      it("Should be able to refresh an access token", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "refresh_token",
                        client_id : testClient.clientName,
                        client_secret : testClient.clientSecret,
                        refresh_token : tokens.refresh_token
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.OK);
                       res.body.should.have.property('access_token');
                       res.body.should.have.property('refresh_token');
                       res.body.should.have.property('expires_in', config.get("security:tokenLifeSecs"));
                       res.body.should.have.property('token_type', "Bearer");

                       // remember these new tokens
                       newTokens = res.body;

                       // make sure the new tokens are different
                       newTokens.should.not.equal(tokens);

                       done();
                    });
      });

      it("Should be able to access a protected resource with the new access token", function(done) {
         agent(url)
               .get("/api/v1/users/" + createdUsers.testUser1.id)
               .set({
                       Authorization : "Bearer " + newTokens.access_token
                    })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.OK);
                       done();
                    });
      });

      it("Should not be able to access a protected resource with the old access token", function(done) {
         agent(url)
               .get("/api/v1/users/" + createdUsers.testUser1.id)
               .set({
                       Authorization : "Bearer " + tokens.access_token
                    })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);
                       done();
                    });
      });

      it("Should not be able to refresh an access token with an invalid refresh token", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "refresh_token",
                        client_id : testClient.clientName,
                        client_secret : testClient.clientSecret,
                        refresh_token : "bogus"
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.FORBIDDEN);
                       res.body.should.have.property('error', 'invalid_grant');
                       res.body.should.have.property('error_description', 'Invalid refresh token');

                       done();
                    });
      });

      it("Should not be able to refresh an access token with a valid refresh token but invalid client ID", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "refresh_token",
                        client_id : "bogus",
                        client_secret : testClient.clientSecret,
                        refresh_token : newTokens.refresh_token
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);

                       done();
                    });
      });

      it("Should not be able to refresh an access token with a valid refresh token but invalid client secret", function(done) {
         agent(url)
               .post("/oauth/token")
               .send({
                        grant_type : "refresh_token",
                        client_id : testClient.clientName,
                        client_secret : "bogus",
                        refresh_token : newTokens.refresh_token
                     })
               .end(function(err, res) {
                       if (err) {
                          return done(err);
                       }

                       res.should.have.property('status', httpStatus.UNAUTHORIZED);

                       done();
                    });
      });

      describe("Get User Info", function() {

         it("Should be able to get user info with valid access token", function(done) {
            agent(url)
                  .get("/api/v1/users/" + createdUsers.testUser1.id + "?fields=id,email,displayName")
                  .set({
                          Authorization : "Bearer " + newTokens.access_token
                       })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }
                          res.should.have.property('status', httpStatus.OK);
                          res.body.should.have.property('code', httpStatus.OK);
                          res.body.should.have.property('status', 'success');
                          res.body.should.have.property('data');
                          res.body.data.should.have.property('id', createdUsers.testUser1.id);
                          res.body.data.should.have.property('email', createdUsers.testUser1.email);
                          res.body.data.should.have.property('displayName', createdUsers.testUser1.displayName);

                          done();
                       });
         });

         it("Should fail to get user info for another user with valid access token", function(done) {
            agent(url)
                  .get("/api/v1/users/" + createdUsers.testUser2.id + "?fields=id,email,displayName")
                  .set({
                          Authorization : "Bearer " + newTokens.access_token
                       })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.FORBIDDEN);
                          res.body.should.have.property('code', httpStatus.FORBIDDEN);
                          res.body.should.have.property('status', 'error');
                          res.body.should.have.property('data');

                          done();
                       });
         });

         it("Should fail to get user info without an access token", function(done) {
            agent(url)
                  .get("/api/v1/users/" + createdUsers.testUser1.id)
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNAUTHORIZED);

                          done();
                       });
         });

         it("Should fail to get user info with an invalid access token", function(done) {
            agent(url)
                  .get("/api/v1/users/" + createdUsers.testUser1.id)
                  .set({
                          Authorization : "Bearer " + "bogus"
                       })
                  .end(function(err, res) {
                          if (err) {
                             return done(err);
                          }

                          res.should.have.property('status', httpStatus.UNAUTHORIZED);

                          done();
                       });
         });

      });

   });

   describe("Database", function() {
      describe("Clients", function() {
         it("Should not be able to create the same client again", function(done) {
            db.clients.create(testClient, null, function(err, result) {
               (err != null).should.be.true;
               (result == null).should.be.true;
               (err instanceof DuplicateRecordError).should.be.true;
               err.should.have.property("data");
               err.data.should.have.property("code", "ER_DUP_ENTRY");
               done();
            });
         });

         it("Should be able to find a client by name and secret", function(done) {
            db.clients.findByNameAndSecret(testClient.clientName, testClient.clientSecret, function(err, client) {
               if (err) {
                  return done(err);
               }
               client.should.have.property("id");
               client.should.have.property("displayName", testClient.displayName);
               client.should.have.property("clientName", testClient.clientName);
               client.should.have.property("clientSecret");
               client.should.have.property("created");
               done();
            });
         });

         it("Should not be able to find a client by name and secret with a non-existent name", function(done) {
            db.clients.findByNameAndSecret("bogus", testClient.clientSecret, function(err, client) {
               if (err) {
                  return done(err);
               }
               assert.equal(client, null);
               done();
            });
         });

         it("Should not be able to find a client by name and secret with an incorrect secret", function(done) {
            db.clients.findByNameAndSecret(testClient.clientName, "bogus", function(err, client) {
               if (err) {
                  return done(err);
               }
               assert.equal(client, null);
               done();
            });
         });
      });

      describe("Users", function() {
         var foundUser = null;

         it("Should not be able to create the same user again", function(done) {
            db.users.create(testUser1, function(err, result) {
               (err != null).should.be.true;
               (result == null).should.be.true;
               (err instanceof DuplicateRecordError).should.be.true;
               err.should.have.property("data");
               err.data.should.have.property("code", "ER_DUP_ENTRY");
               done();
            });
         });

         it("Should be able to find a user by email", function(done) {
            db.users.findByEmail(testUser1.email, function(err, user) {
               if (err) {
                  return done(err);
               }
               user.should.have.property("id");
               user.should.have.property("email", testUser1.email);
               user.should.have.property("password");
               user.should.have.property("displayName", testUser1.displayName);
               user.should.have.property("created");
               user.should.have.property("modified");

               // remember this user so we can do the next test
               foundUser = user;

               done();
            });
         });

         it("Should be able to find a user by ID", function(done) {
            db.users.findById(foundUser.id, function(err, user) {
               if (err) {
                  return done(err);
               }

               // do a deep equal
               should(user).eql(foundUser);

               done();
            });
         });

         it("Should be able to find a user by email and password", function(done) {
            db.users.findByEmailAndPassword(testUser1.email, testUser1.password, function(err, user) {
               if (err) {
                  return done(err);
               }
               user.should.have.property("id");
               user.should.have.property("email", testUser1.email);
               user.should.have.property("password");
               user.should.have.property("displayName", testUser1.displayName);
               user.should.have.property("created");
               user.should.have.property("modified");

               done();
            });
         });

         it("Should not be able to find a user by a non-existent email", function(done) {
            db.users.findByEmail("bogus", function(err, user) {
               if (err) {
                  return done(err);
               }
               assert.equal(user, null);

               done();
            });
         });

         it("Should not be able to find a user by a non-existent ID", function(done) {
            db.users.findById(-1, function(err, user) {
               if (err) {
                  return done(err);
               }
               assert.equal(user, null);

               done();
            });
         });

         it("Should not be able to find a user by email and password with a non-existent email", function(done) {
            db.users.findByEmailAndPassword("bogus", testUser1.password, function(err, user) {
               if (err) {
                  return done(err);
               }
               assert.equal(user, null);

               done();
            });
         });

         it("Should not be able to find a user by email and password with an incorrect password", function(done) {
            db.users.findByEmailAndPassword(testUser1.email, "bogus", function(err, user) {
               if (err) {
                  return done(err);
               }
               assert.equal(user, null);

               done();
            });
         });

         describe("Reset Password", function() {

            var resetPasswordToken = null;
            var foundUser = null;
            var newPassword = 'this is my new password';

            it("Should be able to create a reset password token", function(done) {
               db.users.findByEmail(testUser1.email, function(err, user) {
                  if (err) {
                     return done(err);
                  }
                  foundUser = user;

                  db.users.createResetPasswordToken(user.email, function(err, token) {
                     if (err) {
                        return done(err);
                     }
                     (token != null).should.be.true;

                     // remember the token so we can use it to reset the user's password
                     resetPasswordToken = token;

                     done();
                  });
               });
            });

            it("Should be able to set the password using the reset password token", function(done) {
               db.users.setPassword(resetPasswordToken, newPassword, function(err, wasSuccessful) {
                  if (err) {
                     return done(err);
                  }
                  wasSuccessful.should.be.true;

                  // do a find on the user to verify that the password and modification timestamp changed
                  db.users.findByEmail(testUser1.email, function(err, user) {
                     if (err) {
                        return done(err);
                     }
                     (foundUser.password != user.password).should.be.true;
                     (foundUser.modified != user.modified).should.be.true;
                     user.should.have.property('resetPasswordToken', null);
                     user.should.have.property('resetPasswordExpiration', '0000-00-00 00:00:00');

                     done();
                  });
               });
            });

         });   // end Reset Password
      });      // end Users

      describe("Products, Devices, and Feeds", function() {
         var productInsertIds = {};
         var userIds = {};

         before(function(initDone) {
            // find the user database IDs
            var getUserId = function(userEmail, callback) {
               db.users.findByEmail(userEmail, function(err, user) {
                  if (err) {
                     return initDone(err);
                  }

                  callback(user.id);
               });
            };

            flow.series([
                           function(done) {
                              getUserId(testUser1.email, function(userId) {
                                 userIds.testUser1 = userId;
                                 done();
                              });
                           },
                           function(done) {
                              getUserId(testUser2.email, function(email) {
                                 userIds.testUser2 = email;
                                 done();
                              });
                           }
                        ],
                        initDone);
         });

         describe("Products", function() {

            it("Should be able to create a product with a null creator", function(done) {
               db.products.create(testProduct4, null, function(err, product) {
                  if (err) {
                     return done(err);
                  }

                  product.should.have.property('insertId');
                  product.should.have.property('name', testProduct4.name);

                  // remember the insert ID
                  productInsertIds.testProduct4 = product.insertId;

                  done();
               });
            });

            it("Should fail to create a product with a name that doesn't contain at least one letter", function(done) {
               var invalidProduct = shallowClone(testProduct4);
               invalidProduct.name = "4242";

               db.products.create(invalidProduct, null, function(err, product) {

                  assert.notEqual(err, null);
                  assert.equal(product, null);

                  err.should.have.property('data');
                  err.data.should.have.length(1);
                  err.data[0].should.have.property('instanceContext', '#/name');
                  err.data[0].should.have.property('constraintName', 'pattern');
                  err.data[0].should.have.property('kind', 'StringValidationError');
                  err.data[0].should.have.property('testedValue', invalidProduct.name);

                  done();
               });
            });

            it("Should be able to create a product with a non-null creator", function(done) {
               db.products.create(testProduct5, userIds.testUser1, function(err, product) {
                  if (err) {
                     return done(err);
                  }

                  product.should.have.property('insertId');
                  product.should.have.property('name', testProduct5.name);

                  // remember the insert ID
                  productInsertIds.testProduct5 = product.insertId;

                  done();
               });
            });

            it("Should be able to find a product by name", function(done) {
               db.products.findByName(testProduct4.name, null, function(err, product) {
                  if (err) {
                     return done(err);
                  }

                  product.should.have.property('id', productInsertIds.testProduct4);
                  product.should.have.property('name', testProduct4.name);
                  product.should.have.property('prettyName', testProduct4.prettyName);
                  product.should.have.property('vendor', testProduct4.vendor);
                  product.should.have.property('description', testProduct4.description);
                  product.should.have.property('creatorUserId', null);
                  product.should.have.property('created');
                  product.should.have.property('modified');

                  // do a deep equal
                  should(JSON.parse(product.defaultChannelSpecs)).eql(testProduct4.defaultChannelSpecs);

                  done();
               });
            });

            it("Should be able to find a product by ID", function(done) {
               db.products.findById(productInsertIds.testProduct5, null, function(err, product) {
                  if (err) {
                     return done(err);
                  }

                  product.should.have.property('id', productInsertIds.testProduct5);
                  product.should.have.property('name', testProduct5.name);
                  product.should.have.property('prettyName', testProduct5.prettyName);
                  product.should.have.property('vendor', testProduct5.vendor);
                  product.should.have.property('description', testProduct5.description);
                  product.should.have.property('creatorUserId', userIds.testUser1);
                  product.should.have.property('created');
                  product.should.have.property('modified');

                  // do a deep equal
                  should(JSON.parse(product.defaultChannelSpecs)).eql(testProduct5.defaultChannelSpecs);

                  done();
               });
            });

            describe("Devices", function() {

               var deviceInsertIds = {};

               it("Should be able to create a device", function(done) {
                  db.devices.create(testDevice5, productInsertIds.testProduct4, userIds.testUser1, function(err, device) {
                     if (err) {
                        return done(err);
                     }

                     device.should.have.property('insertId');
                     device.should.have.property('serialNumber', testDevice5.serialNumber);

                     // remember the insert ID
                     deviceInsertIds.testDevice5 = device.insertId;

                     done();
                  });
               });

               it("Should be able to find a device by ID and user ID", function(done) {
                  db.devices.findByIdForUser(deviceInsertIds.testDevice5, userIds.testUser1, null, function(err, device) {
                     if (err) {
                        return done(err);
                     }

                     device.should.have.property('id', deviceInsertIds.testDevice5);
                     device.should.have.property('serialNumber', testDevice5.serialNumber);
                     device.should.have.property('productId', productInsertIds.testProduct4);
                     device.should.have.property('userId', userIds.testUser1);
                     device.should.have.property('created');
                     device.should.have.property('modified');

                     done();
                  });
               });

               it("Should be able to find a device by ID and user ID if the user ID is wrong", function(done) {
                  db.devices.findByIdForUser(deviceInsertIds.testDevice5, userIds.testUser2, null, function(err, device) {
                     assert.notEqual(err, null);
                     (err instanceof JSendError).should.be.true;
                     (err instanceof JSendClientError).should.be.true;
                     err.should.have.property('data');
                     err.data.should.have.property('code', httpStatus.FORBIDDEN);
                     err.data.should.have.property('status', 'error');
                     done();
                  });
               });

               it("Should be able to find a device by product ID, serial number, and user ID", function(done) {
                  db.devices.findByProductIdAndSerialNumberForUser(productInsertIds.testProduct4,
                                                                   testDevice5.serialNumber,
                                                                   userIds.testUser1,
                                                                   'id,serialNumber,productId,userId',
                                                                   function(err, device) {
                                                                      if (err) {
                                                                         return done(err);
                                                                      }

                                                                      device.should.have.property('id', deviceInsertIds.testDevice5);
                                                                      device.should.have.property('serialNumber', testDevice5.serialNumber);
                                                                      device.should.have.property('productId', productInsertIds.testProduct4);
                                                                      device.should.have.property('userId', userIds.testUser1);
                                                                      device.should.not.have.property('created');
                                                                      device.should.not.have.property('modified');

                                                                      done();
                                                                   });
               });

               describe("Feeds", function() {

                  var feedInsertIds = {};

                  it("Should be able to create a feed", function(done) {
                     db.feeds.create(testFeed3, deviceInsertIds.testDevice5, productInsertIds.testProduct4, userIds.testUser1, function(err, feed) {
                        if (err) {
                           return done(err);
                        }

                        feed.should.have.property('insertId');
                        feed.should.have.property('apiKey');
                        feed.should.have.property('apiKeyReadOnly');

                        // remember the insert ID
                        feedInsertIds.testFeed3 = feed.insertId;

                        done();
                     });
                  });
               });      // end Feeds

            });      // end Devices

         });      // end Products

      });      // end Products, Devices, and Feeds
   });      // end Database
});      // end ESDR