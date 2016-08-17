var createError = require('http-errors')
var xtend = require('xtend')

var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (osm) {
  return function getElement (id, cb) {
    osm.get(id, function (err, docs) {
      if (err) return cb(err)
      // Sorting forks to try to maintain some consistency in the order they
      // are sent to the client, since most clients will only read the first
      // element returned by this end-point, and sort order is not guaranteed
      // to stay the same on the `docs` object
      // TODO: Sort by date?
      var forks = Object.keys(docs).sort()
      if (forks.length === 0) return cb(createError.NotFound())
      forks = forks.map(function (key) {
        return xtend(docs[key], {
          id: id,
          version: key
        })
      }).map(toOsmObj.fn)
      cb(null, forks)
    })
  }
}
