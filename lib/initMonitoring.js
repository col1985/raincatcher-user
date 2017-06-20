var config = require('./config/config-user');

var stats = require("rhmap-stats").init({
  host: config['monitoringHost'],
  port: config['monitoringPort']
});

module.exports = stats;