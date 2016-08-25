var collect = require('collect-stream')
var xtend = require('xtend')
var mapStream = require('through2-map')

var errors = require('../lib/errors')
var refs2nodes = require('../lib/util').refs2nodes

module.exports = function (osm) {
  return function getHistory (id, cb) {
    var r = osm.kv.createHistoryStream(id).on('error', function (err) {
      if (/^notfound/i.test(err) || err.notFound) {
        err = new errors.NotFound('element id: ' + id)
      }
      if (cb) return cb(err)
      if (stream) return stream.emit('error', err)
    })
    if (cb) {
      collect(r, function (err, rows) {
        if (err) return cb(err)
        cb(null, rows.map(rowMap))
      })
    } else {
      var stream = r.pipe(mapStream.obj(rowMap))
      return stream
    }
  }
}

function rowMap (row) {
  return xtend(refs2nodes(row.value), {
    id: row.key,
    version: row.link
  })
}
