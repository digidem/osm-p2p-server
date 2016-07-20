var from = require('from2')
var createError = require('http-errors')
var pumpify = require('pumpify')
var xtend = require('xtend')

var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (id, osm) {
  var stream = pumpify.obj()
  osm.get(id, function (err, docs) {
    if (err) return stream.emit('error', err)
    // Sorting forks to try to maintain some consistency in the order they
    // are sent to the client, since most clients will only read the first
    // element returned by this end-point, and sort order is not guaranteed
    // to stay the same on the `docs` object
    // TODO: Sort by date?
    var forks = Object.keys(docs).sort()
    if (forks.length === 0) {
      return stream.emit('error', createError.NotFound())
    }
    var elements = forks.map(function (key) {
      return xtend(docs[key], {
        id: id,
        version: key
      })
    })
    var r = from.obj(function (size, cb) {
      if (!elements.length) return cb(null, null)
      cb(null, elements.shift())
    })
    stream.setPipeline(r, toOsmObj())
  })
  return stream
}
