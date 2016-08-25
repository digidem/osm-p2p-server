var collect = require('collect-stream')
var pumpify = require('pumpify')
var mapStream = require('through2-map')

var refs2nodes = require('../lib/util').refs2nodes
var checkRefExist = require('../lib/check_ref_ex.js')

module.exports = function (osm) {
  return function getMap (bbox, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    var query = [[bbox[1], bbox[3]], [bbox[0], bbox[2]]] // left,bottom,right,top
    var queryStream = osm.queryStream(query, opts)
    var queryStreamJson = pumpify.obj(queryStream, checkRefExist(osm), mapStream.obj(refs2nodes))
    if (cb) {
      collect(queryStreamJson, function (err, elements) {
        if (err) return cb(err)
        cb(null, elements)
      })
    } else {
      return queryStreamJson
    }
  }
}
