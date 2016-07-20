var Readable = require('readable-stream').Readable
var createError = require('http-errors')
var pumpify = require('pumpify')
var xtend = require('xtend')

var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (id, version, osm) {
  var stream = pumpify.obj()
  osm.log.get(version, function (err, doc) {
    if (err && (/^notfound/.test(err) || err.notFound)) {
      err = createError(404, err)
    }
    if (err) return stream.emit('error', err)
    var r = new Readable({objectMode: true})
    r.push(xtend(doc.value.v, {
      id: id,
      version: version
    }))
    r.push(null)
    stream.setPipeline(r, toOsmObj())
  })
  return stream
}
