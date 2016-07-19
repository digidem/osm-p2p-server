var through = require('through2')

/**
 * Converts objects returned by osm-p2p-db to objects compatible with the
 * [OSM JSON output format](http://overpass-api.de/output_formats.html#json)
 * @return {stream.Transform}
 */
module.exports = function () {
  return through.obj(function write (row, enc, next) {
    var element = {}
    for (var prop in row) {
      if (!row.hasOwnProperty(prop)) continue
      if (prop === 'refs') {
        element.nodes = row.refs
      } else {
        element[prop] = row[prop]
      }
    }
    next(null, element)
  })
}
