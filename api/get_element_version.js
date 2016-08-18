var xtend = require('xtend')

var errors = require('../lib/errors')
var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (osm) {
  return function (id, version, cb) {
    osm.log.get(version, function (err, doc) {
      if (err && (/^notfound/.test(err) || err.notFound)) {
        err = errors(404, err)
      }
      if (err) return cb(err)
      var element = xtend(doc.value.v, {
        id: id,
        version: version
      })
      cb(null, toOsmObj.fn(element))
    })
  }
}
