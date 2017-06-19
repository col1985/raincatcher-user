'use strict';

var express = require('express')
  , config = require('../../config/config-user');

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
    console.time('@@@-getUsersList');
    userOperations.list().then(function(users) {
      console.timeEnd('@@@-getUsersList');
      res.json(users);
    }, function(error) {
      next(error);
    });
  });

  router.route('/config/authpolicy').get(function(req, res) {
    res.json(config.policyId);
  });

  router.route('/:id').get(function(req, res, next) {
    console.time('@@@-readUserById');
    userOperations.read(req.params.id).then(function(user) {
      console.timeEnd('@@@-readUserById');
      res.json(user);
    }, function(error) {
      next(error);
    });
  });

  router.route('/:id').put(function(req, res, next) {
    console.time('@@@-updateUserById');
    userOperations.update(req.body).then(function(user) {
      console.timeEnd('@@@-updateUserById');
      res.json(user);
    }, function(error) {
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
