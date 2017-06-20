var express = require('express')
  , config = require('../../config/config-user')
  , MbaasServiceProxy = require('./mbaas-service-proxy');

function initRouter(msProxy) {
  var router = express.Router();

  router.route('/auth').post(function(req, res, next) {
    var params = req && req.body && req.body.params;
    console.time('DEBUG-auth');
    msProxy.auth(params).then(function(data) {
      console.timeEnd('DEBUG-auth');
      res.json(data);
    }, function(error) {
      console.timeEnd('DEBUG-auth');
      next(error);
    });
  });

  router.route('/verifysession').post(function(req, res, next) {
    var fhParams = req.fh_params || {__fh: {}};
    var sessionToken = fhParams.__fh.sessionToken || fhParams.__fh.sessiontoken;

    console.time('DEBUG-verifysession');
    msProxy.verifysession(sessionToken).then(function(data) {
      console.timeEnd('DEBUG-verifysession');
      res.json(data);
    }, function(error) {
      console.timeEnd('DEBUG-verifysession');
      next(error);
    });
  });

  router.route('/revokesession').post(function(req, res, next) {
    var fhParams = req.fh_params || {__fh: {}};
    var sessionToken = fhParams.__fh.sessionToken || fhParams.__fh.sessiontoken
    console.time('DEBUG-revokesession');
    msProxy.revokesession(sessionToken).then(function(data) {\
      console.timeEnd('DEBUG-revokesession');
      res.json(data);
    }, function(error) {
      console.timeEnd('DEBUG-revokesession');
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

  console.time('DEBUG-wfm:user:session:validate');
  // subscribe for session validation topic
  self.mediator.subscribe('wfm:user:session:validate', function(sessionToken) {
    return msProxy.verifysession(sessionToken)
      .then(function(validationResponse) {
        // needs to publish the validation response topic
        console.timeEnd('DEBUG-wfm:user:session:validate');
        self.mediator.publish('done:' + 'wfm:user:session:validate:' + sessionToken, validationResponse);
      })
      .catch(function(err) {
        console.timeEnd('DEBUG-wfm:user:session:validate');
        self.mediator.publish('error:' + 'wfm:user:session:validate:' + sessionToken, err);
      });
  });
};
