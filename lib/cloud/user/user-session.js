var express = require('express')
  , config = require('../../config/config-user')
  , MbaasServiceProxy = require('./mbaas-service-proxy');

var monit = require('./../../initMonitoring.js');
var stats = monit.stats;

function initRouter(msProxy) {
  var router = express.Router();

  router.route('/auth').post(function(req, res, next) {
    var params = req && req.body && req.body.params;
    var timer = stats.time('user-session-auth', {cred: req.body.params});
    msProxy.auth(params).then(function(data) {
      stats.timeEnd(timer);
      res.json(data);
    }, function(error) {
      stats.timeEnd(timer);
      next(error);
    });
  });

  router.route('/verifysession').post(function(req, res, next) {
    var fhParams = req.fh_params || {__fh: {}};
    var sessionToken = fhParams.__fh.sessionToken || fhParams.__fh.sessiontoken;

    var timer = stats.time('user-session-verifysession', {token: sessionToken});
    msProxy.verifysession(sessionToken).then(function(data) {
      timer.timeEnd(timer);
      res.json(data);
    }, function(error) {
      timer.timeEnd(timer);
      next(error);
    });
  });

  router.route('/revokesession').post(function(req, res, next) {
    var fhParams = req.fh_params || {__fh: {}};
    var sessionToken = fhParams.__fh.sessionToken || fhParams.__fh.sessiontoken;

    var timer = stats.time('user-session-revokesession', {token: sessionToken});
    msProxy.revokesession(sessionToken).then(function(data) {
      stats.timeEnd(timer);
      res.json(data);
    }, function(error) {
      stats.timeEnd(timer);
      next(error);
    });
  });

  return router;
}

/**
 * Subscribe for user session validation
 * Route Auth requests to config.authpolicyPath endpoint
 * @param mediator subscribe for all validation messages
 * @param app cloud application
 * @param guid name of MBaas Service
 */
module.exports = function(mediator, app, guid) {
  var self = this;
  self.mediator = mediator;

  var msProxy = new MbaasServiceProxy(guid);
  var router = initRouter(msProxy);
  app.use(config.authpolicyPath, router);

  // subscribe for session validation topic
  self.mediator.subscribe('wfm:user:session:validate', function(sessionToken) {
    var timer = stats.time('user-session-validateSession',{ token: sessionToken });

    return msProxy.verifysession(sessionToken)
      .then(function(validationResponse) {
        // needs to publish the validation response topic
        stats.timeEnd(timer);
        self.mediator.publish('done:' + 'wfm:user:session:validate:' + sessionToken, validationResponse);
      })
      .catch(function(err) {
        stats.timeEnd(timer);
        self.mediator.publish('error:' + 'wfm:user:session:validate:' + sessionToken, err);
      });
  });
};
