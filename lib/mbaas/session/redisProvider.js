var redis = require('redis');
var _ = require('lodash');
module.exports = {
  init: function(expressConfig, session, cb) {
    var connectRedis = require('connect-redis')(session);
    this.client = redis.createClient(expressConfig.config);
    var storeConf = _.defaults(expressConfig.config, {
      client: this.client
    });
    this.store = new connectRedis(storeConf);
    this.client.once('ready', function() {
      cb();
    });
    this.client.once('error', function(e) {
      cb(e);
    });
  },
  verifySession: function(token, cb) {
    this.client.exists('sess:' + token, function(err, value) {
      console.log('err:RedisProvider=' + JSON.stringify(err));
      console.log('value:RedisProvider=' + JSON.stringify(value));
      cb(err, !!value);
    });
  },
  revokeSession: function(token, cb) {
    this.client.del('sess:' + token, function(err, value) {
      cb(err, !!value);
    });
  },
  defaultConfig: {
    host: '127.0.0.1',
    port: '6379',
    logErrors: process.env.NODE_ENV === 'development'
  }
};