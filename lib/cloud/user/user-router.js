'use strict';

var express = require('express')
  , config = require('../../config/config-user');

// var monit = require('./../../initMonitoring.js');

/**
 *
 * Router for handling cloud user requests
 *
 * @param {UserOperations} userOperations
 * @returns {*}
 */
function initRouter(userOperations) {
  var router = express.Router();

  router.route('/').get(function(req, res, next) {
    // var timer = stats.time('getUsersList');
    userOperations.list().then(function(users) {
      // stats.timeEnd(timer);
      res.json(users);
    }, function(error) {
      // stats.timeEnd(timer);
      next(error);
    });
  });

  router.route('/config/authpolicy').get(function(req, res) {
    res.json(config.policyId);
  });

  router.route('/:id').get(function(req, res, next) {
    // var timer = stats.time('readUserById', {id: req.params.id});
    userOperations.read(req.params.id).then(function(user) {
      // stats.timeEnd(timer);
      res.json(user);
    }, function(error) {
      // stats.timeEnd(timer);
      next(error);
    });
  });

  router.route('/:id').put(function(req, res, next) {
    // var timer = stats.time('updateUserById', {id: req.params.id});
    userOperations.update(req.body).then(function(user) {
      // stats.timeEnd(timer);
      res.json(user);
    }, function(error) {
      // stats.timeEnd(timer);
      next(error);
    });
  });

  router.route('/').post(function(req, res, next) {
    userOperations.create(req.body).then(function(user) {
      res.json(user);
    }, function(error) {
      next(error);
    });
  });

  router.route('/:id').delete(function(req, res, next) {
    userOperations.remove(req.body).then(function(user) {
      res.json(user);
    }, function(error) {
      next(error);
    });
  });

  return router;
}

/**
 * Route User requests to config.apiPath endpoint
 *
 * @param app
 * @param {UserOperations} userOperations
 */
module.exports = function(app, userOperations) {
  var router = initRouter(userOperations);
  app.use(config.apiPath, router);
};
