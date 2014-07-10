var crypto = require('crypto');
var flow = require('nimble');
var executeQuery = require('./db_utils').executeQuery;
var findOne = require('./db_utils').findOne;
var findOneUsingConnection = require('./db_utils').findOneUsingConnection;
var config = require('../config');
var log = require('log4js').getLogger();

var TOKENS_CREATE_TABLE_QUERY = " CREATE TABLE IF NOT EXISTS `Tokens` ( " +
                                "`id` bigint(20) NOT NULL AUTO_INCREMENT, " +
                                "`userId` bigint(20) NOT NULL, " +
                                "`clientId` bigint(20) NOT NULL, " +
                                "`accessToken` varchar(255) NOT NULL, " +
                                "`refreshToken` varchar(255) NOT NULL, " +
                                "`created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                                "PRIMARY KEY (`id`), " +
                                "UNIQUE KEY `unique_accessToken` (`accessToken`), " +
                                "UNIQUE KEY `unique_refreshToken` (`refreshToken`), " +
                                "UNIQUE KEY `userId_clientId_index` (`userId`,`clientId`), " +
                                "KEY `userId` (`userId`), " +
                                "KEY `clientId` (`clientId`), " +
                                "CONSTRAINT `refreshtokens_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `Users` (`id`), " +
                                "CONSTRAINT `refreshtokens_ibfk_2` FOREIGN KEY (`clientId`) REFERENCES `Clients` (`id`) " +
                                ") ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8";

module.exports = function(pool) {

   var self = this;

   this.initialize = function(callback) {
      pool.getConnection(function(err1, connection) {
         if (err1) {
            callback(err1, null);
         }
         else {
            connection.query(TOKENS_CREATE_TABLE_QUERY, function(err2) {
               connection.release();

               if (err2) {
                  log.error("Error trying to create the Tokens table: " + err2);
                  callback(err2, null);
               }
               else {
                  callback(null, true);
               }
            });
         }
      });
   };

   var generateTokens = function() {
      return {
         access : crypto.randomBytes(128).toString('base64'),
         refresh : crypto.randomBytes(128).toString('base64')
      };
   };

   this.create = function(userId, clientId, callback) {
      log.debug("creating tokens for user [" + userId + "] and client [" + clientId + "]");

      // generate new token values
      var tokenValues = generateTokens();

      var queryParams = {
         userId : userId,
         clientId : clientId,
         accessToken : tokenValues.access,
         refreshToken : tokenValues.refresh
      };

      executeQuery(pool, "INSERT INTO Tokens SET ? ON DUPLICATE KEY UPDATE accessToken=VALUES(accessToken), refreshToken=VALUES(refreshToken), created=now()",
                   queryParams,
                   function(err2) {
                      if (err2) {
                         log.error("Error trying to create tokens for user [" + userId + "] and client [" + clientId + "]: " + err2);
                         return callback(err2);
                      }

                      return callback(null, tokenValues);
                   });

   };

   this.remove = function(userId, clientId, callback) {
      executeQuery(pool, "DELETE FROM Tokens WHERE userId=? AND clientId=?",
                   [userId, clientId],
                   function(err) {
                      if (err) {
                         callback(err, false);
                      }
                      else {
                         callback(null, true);
                      }
                   });
   };

   this.refreshToken = function(clientId, refreshToken, callback) {

      var connection = null;
      var errors = [];
      var hasErrors = function() {
         return errors.length > 0
      };
      var userId = null;
      var newTokens = null;

      log.debug("Refreshing access token with this refresh token: " + refreshToken);
      flow.series(
            [
               // get the connection
               function(done) {
                  log.debug("refreshToken(): 1) Getting the connection");
                  pool.getConnection(function(err, newConnection) {
                     if (err) {
                        errors.push(err);
                     }
                     else {
                        connection = newConnection;
                     }
                     done();
                  });
               },

               // begin the transaction
               function(done) {
                  if (!hasErrors()) {
                     log.debug("refreshToken(): 2) Beginning the transaction");
                     connection.beginTransaction(function(err) {
                        if (err) {
                           errors.push(err);
                        }
                        done();
                     });
                  }
                  else {
                     done();
                  }
               },

               // find the refresh token for this client--from this we'll determine the userId of the user owning this token
               function(done) {
                  if (!hasErrors()) {
                     log.debug("refreshToken(): 3) Find the refresh token for the client");
                     findOneUsingConnection(connection,
                                            "SELECT userId FROM Tokens WHERE refreshToken=? AND clientId=?",
                                            [refreshToken, clientId],
                                            function(err, result) {
                                               if (err) {
                                                  errors.push(err);
                                               }
                                               else {
                                                  // might be null if not found, but that's OK--later code will deal appropriately
                                                  userId = result ? result.userId : null;
                                                  log.debug("refreshToken():    Refresh token exists=(" + (userId != null) + "), userId=" + JSON.stringify(userId, null, 3));
                                               }
                                               done();
                                            });
                  }
                  else {
                     done();
                  }
               },

               // generate new tokens and update the record
               function(done) {
                  if (!hasErrors() && userId) {
                     log.debug("refreshToken(): 4) generate new tokens and update the record");

                     self.create(userId, clientId, function(err, tokens) {
                        if (err) {
                           errors.push(err);
                        }
                        else {
                           newTokens = tokens;
                        }
                        done();
                     });
                  }
                  else {
                     done();
                  }
               }
            ],

            // handle outcome
            function() {
               log.debug("refreshToken(): 5) All done, now checking status and performing commit/rollback as necessary!");
               if (hasErrors()) {
                  connection.rollback(function() {
                     connection.release();
                     log.error("refreshToken():    Error(s) occurred while refreshing token, rolled back the transaction. Error(s):");
                     errors.forEach(function(e) {
                        log.error("   " + e);
                     });

                     var error = new Error("Error(s) occurred while refreshing token. See errors property in this object.");
                     error.errors = errors;
                     callback(error);
                  });
               }
               else {
                  log.debug("refreshToken():    No errors while refreshing token, committing...");
                  connection.commit(function(err) {
                     if (err) {
                        log.error("refreshToken():    Failed to commit the transaction after refreshing token");

                        // rollback and then release the connection
                        connection.rollback(function() {
                           connection.release();
                           callback(err);
                        });
                     }
                     else {
                        connection.release();
                        log.debug("refreshToken():    Commit successful!");
                        callback(null, newTokens);
                     }
                  });
               }
            }
      );
   };

   /**
    * Tries to find the given access token. Returns the full token details (userId, clientId, access and refresh tokens,
    * creation date, etc.) if it exists and has not expired.  Returns <code>null</code> if it either doesn't exist or is
    * expired.  Also, if expired, this method removes the token record from the database.
    *
    * @param {string} accessToken the access token to validate
    * @param {function} callback callback function with signature <code>callback(err, token, message)</code>
    */
   this.validateAccessToken = function(accessToken, callback) {

      log.debug("validateAccessToken(): validating access token: " + accessToken);
      findOne(pool, 'SELECT * FROM Tokens where accessToken=?', [accessToken], function(err, token) {
         if (err) {
            return callback(err);
         }

         // if not null, then check expiration
         if (token) {
            var isExpired = Math.round((Date.now() - new Date(token.created).getTime()) / 1000) > config.get('security:tokenLifeSecs');
            if (isExpired) {
               executeQuery(pool, "DELETE FROM Tokens WHERE id=?", [token.id], function(err) {
                  if (err) {
                     return callback(err);
                  }
                  log.debug("validateAccessToken(): token expired!");
                  return callback(null, null);
               });
            }
            else {
               log.debug("validateAccessToken(): token found!");
               return callback(null, token);
            }
         }

         log.debug("validateAccessToken(): token not found!");
         callback(null, null);
      });
   };
};
