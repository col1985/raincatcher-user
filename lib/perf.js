module.exports.start = function(label) {
  return console.time(label);
}

module.exports.end = function(label) {
  return console.timeEnd(label);
}