var session = require('express-session');
var _ = require('lodash');
var sessionProviders = require('./session');


var provider;

var monit = require('./../initMonitoring');
var perf = require('./../perf');
var stats = monit.stats;


/**
* Function to setup express-session and connect-mongo with the configuration sent from the raincatcher-demo-auth application.
* Default configuration options are also provided.
* @param sessionConfig {object} - the configuration for express-session and connect-mongo
* @callback cb - err, session config for connect-mongo
*/
function init(sessionConfig, cb) {
  if (!(_.isObject(sessionConfig))) {
    return cb(new Error("Session Config is not a valid Object"), null);
  }

  sessionConfig.store = sessionConfig.store || 'redis';

  if (!sessionProviders[sessionConfig.store]) {
    return cb(new Error("Session Storage Provider is not supported."), null);
  }

  provider = sessionProviders[sessionConfig.store];
  var expressSessionConfig = addConfigDefaults(sessionConfig);

  var config = {session: session, options: expressSessionConfig};
  return provider.init(expressSessionConfig, session, function(err) {
    if (err) {
      return cb(err);
    }
    config.store = provider.store;
    return cb(null, config);
  });
}


/**
 * Middleware that fills the req.sessionValid boolean
 */
function verifySession(req, res, next) {
  // var timer = stats.time('mbaas-verifysession');
  var sessionId = req.body.sessionToken || req.sessionID;

  if (!sessionId) {
    req.sessionValid = false;
    stats.timeEnd(timer);
    return next();
  }

  var label = 'auth-mbaas-sessionMW-verifysession-' + sessionId;
  perf.start(label);
  provider.verifySession(sessionId, function(err, session) {
    if (err) {
      perf.end(label);
      return next(err);
    }
    req.session = session;
    perf.end(label);
    return next();
  });
}

function revokeSession(req, res, next) {
  var sessionId = req.body.sessionToken || req.sessionID;
  if (!sessionId) {

    return next(new Error('sessionToken required'));
  }

  provider.revokeSession(sessionId, next);
}

function addConfigDefaults(config) {
  return _.defaultsDeep(config, {
    config: {
      secret: process.env.FH_COOKIE_SECRET || 'raincatcher',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV !== 'development',
        httpOnly: true,
        path: '/'
      }
    }
  }, {
    config: provider.defaultConfig
  });
}

module.exports = {
  verifySession: verifySession,
  init: init,
  revokeSession: revokeSession
};
