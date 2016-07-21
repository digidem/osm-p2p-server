var createError = require('http-errors')
var xtend = require('xtend')

var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (id, version, osm, cb) {
  osm.log.get(version, function (err, doc) {
    if (err && (/^notfound/.test(err) || err.notFound)) {
      err = createError(404, err)
    }
    if (err) return cb(err)
    var element = xtend(doc.value.v, {
      id: id,
      version: version
    })
    cb(null, toOsmObj.fn(element))
  })
}
