var xtend = require('xtend')

var errors = require('../lib/errors')
var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (osm) {
  return function getElement (id, cb) {
    osm.get(id, function (err, docs) {
      if (err) return cb(err)
      var forks = Object.keys(docs)
      if (forks.length === 0) return cb(new errors.NotFound('element id: ' + id))
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
