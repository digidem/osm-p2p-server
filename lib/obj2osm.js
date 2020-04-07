const obj2osm = require('obj2osm')
const pumpify = require('pumpify')
const util = require('./util')

module.exports = function (opts) {
  var stream = pumpify.obj()
  var original = obj2osm(opts)
  stream.setPipeline(util.convertObservationStream(), original)
  return stream
}
