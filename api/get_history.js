var collect = require('collect-stream')
var xtend = require('xtend')
var mapStream = require('through2-map')

var errors = require('../lib/errors')
var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (osm) {
  return function getHistory (id, cb) {
    var r = osm.kv.createHistoryStream(id).on('error', function (err) {
      if (/^notfound/i.test(err) || err.notFound) {
        stream.emit('error', new errors.NotFound('element id: ' + id))
      } else {
        stream.emit('error', err)
      }
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
  return xtend(toOsmObj.fn(row.value), {
    id: row.key,
    version: row.link
  })
}

function notFound (err) {
  return err && (/^notfound/i.test(err) || err.notFound)
}
