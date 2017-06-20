'use strict';

var express = require('express');
var config = require('../config/config-user');
var userAuth = require('./mbaas-auth');
var sessionMiddleware = require('./mbaas-session-middleware');
var shortid = require('shortid');
var _ = require('lodash');

var monit = require('./../initMonitoring.js');
var stats = monit.stats;

function initRouter(mediator, userProfileExclusionList, expressSessionMiddleware) {
  var router = express.Router();

  router.all('/auth', function(req, res) {
    var params = req.body;
    var userId = params && params.userId || params.username;

    var timer = stats.time('mbaas-auth', {
      userId: userId
    });

    //If there is no userId, then we cannot authenticate.
    if (!userId) {
      res.status(400);
      return res.json({message: 'Invalid credentials'});
    }

    // try to authenticate
    userAuth.auth(mediator, userId, params.password)
      .then(function(profileData) {
        // trim the user profile data to remove specified fields when a user read from the database occurs
        var authResponse = trimProfileData(profileData, userProfileExclusionList);
        // on success pass relevant data into response

        //Using express-session to generate and store a session.
        //This is only done for authenticated requests. Otherwise we don't generate a session
        //as it would cause a session to be created for every request.
        return expressSessionMiddleware(req, res, function(err) {
          //An error occurred while trying to create a valid session token for the user.
          if (err) {
            stats.timeEnd(timer);
            return res.status(500).json({message: "Unexpected error when creating a session. Please try again."});
          }
          req.session.userId = profileData.id;
          stats.timeEnd(timer);
          return res.status(200).json({
            status: 'ok',
            userId: userId,
            sessionToken: req.sessionID,
            authResponse: authResponse
          });
        });
      })
      .catch(function(err) {
        // on error pass error message into response body, assign 401 http code.
        // 401 - invalid credentials (unauthorised)
        res.status(401);
        stats.timeEnd(timer);
        res.json(err.message ? err.message : 'Invalid Credentials');
      });
  });

  router.all('/verifysession', sessionMiddleware.verifySession, function(req, res) {
    res.json(req.session);
  });

  router.all('/revokesession', sessionMiddleware.revokeSession, function(req, res) {
    res.json({});
  });

  router.route('/').get(function(req, res) {
    mediator.once('done:wfm:user:list', function(data) {
      // remove any sensitive fields from the user profile data, eg password.
      _.forEach(data, function(user, index) {
        data[index] = trimProfileData(user, userProfileExclusionList);
      });
      res.json(data);
    });
    mediator.publish('wfm:user:list');
  });
  router.route('/:id').get(function(req, res) {
    var userId = req.params.id;
    // remove any sensitive fields from the user profile data, eg password.
    mediator.once('done:wfm:user:read:' + userId, function(data) {
      data = trimProfileData(data, userProfileExclusionList);
      res.json(data);
    });
    mediator.publish('wfm:user:read', userId);
  });
  router.route('/:id').put(function(req, res) {
    var userId = req.params.id;
    var user = req.body.user;
    mediator.once('done:wfm:user:update:' + userId, function(saveduser) {
      res.json(saveduser);
    });
    mediator.publish('wfm:user:update', user);
  });
  router.route('/').post(function(req, res) {
    var ts = new Date().getTime();
    var user = req.body.user;
    user.createdTs = ts;
    if (!user.id) {
      user.id = shortid.generate();
    }
    mediator.once('done:wfm:user:create:' + user.id, function(createduser) {
      res.json(createduser);
    });
    mediator.publish('wfm:user:create', user);
  });
  router.route('/:id').delete(function(req, res) {
    var userId = req.params.id;
    var user = req.body.user;
    mediator.once('done:wfm:user:delete:' + userId, function(deleted) {
      res.json(deleted);
    });
    mediator.publish('wfm:user:delete', user);
  });
  return router;
}

/**
* Function to trim the User Profile Data to prevent sensitive fields from being sent.
* By default, the password will be removed from the response.
* @param profileData {object} - the untrimmed user profile data
* @param exclusionList {array} - the array of field names to remove from the authentication response
* @return trimmedProfileData {object} - the trimmed profileData
*/
function trimProfileData(profileData, exclusionList) {
  if (!exclusionList) {
    // return a default auth response if the exclusion list is null or undefined
    return _.omit(profileData, config.defaultProfileDataExclusionList);
  }
  return _.omit(profileData, exclusionList);
}

/**
 * Initializes the router, mounting it in the supplied express application
 * @param  {Mediator}   mediator                 Mediator instance from fh-wfm-mediator
 * @param  {Express.App}   app                   Express application
 * @param  {Array}   authResponseExclusionList   List of fields in the User schema to exclude from responses
 * @param  {Object}   sessionOptions             Options for storage and express-session
 * @param  {Function} cb                         Node-style callback
 */
function init(mediator, app, authResponseExclusionList, sessionOptions, cb) {

  sessionMiddleware.init(sessionOptions, function(err, result) {
    if (err) {
      return cb(err);
    }

    //Creating the express-session middleware using the redis or mongo database.
    var expressSessionMiddleware = result.session({
      secret: result.options.config.secret,
      store: result.store,
      genid: result.options.config.genid,
      resave: result.options.config.resave,
      saveUninitialized: result.options.config.saveUninitialized
    });


    //The express session is only used for authentication responses
    var router = initRouter(mediator, authResponseExclusionList, expressSessionMiddleware);
    app.use(config.apiPath, router);
    return cb();
  });
}

module.exports = {
  init: init,
  trimProfileData: trimProfileData
};
