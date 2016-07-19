var through = require('through2')

/**
 * Converts objects compatible with the
 * [OSM JSON output format](http://overpass-api.de/output_formats.html#json)
 * to objects understood by osm-p2p-db
 * @return {stream.Transform}
 */
module.exports = function () {
  return through.obj(function write (row, enc, next) {
    var element = {}
    for (var prop in row) {
      if (!row.hasOwnProperty(prop)) continue
      if (prop === 'nodes') {
        element.refs = row.nodes
      } else {
        element[prop] = row[prop]
      }
    }
    next(null, element)
  })
}
