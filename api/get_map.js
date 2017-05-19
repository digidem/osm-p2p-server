var collect = require('collect-stream')
var pumpify = require('pumpify')
var mapStream = require('through2-map')
var collectTransform = require('collect-transform-stream')
var defork = require('osm-p2p-defork')
var through = require('through2')

var refs2nodes = require('../lib/util').refs2nodes
var checkRefExist = require('../lib/check_ref_ex.js')

module.exports = function (osm) {
  return function getMap (bbox, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    opts.forks = opts.forks || false

    var query = [[bbox[1], bbox[3]], [bbox[0], bbox[2]]] // left,bottom,right,top

    // For now, filter deletions (until downstream can handle them)
    var deletionFilter = through.obj(function (chunk, enc, next) {
      if (!chunk.deleted) next(null, chunk)
      else next()
    })

    var pipeline = [
      osm.queryStream(query, opts),
      deletionFilter,
      checkRefExist(osm),
      mapStream.obj(refs2nodes)
    ]

    // If forks ought to be filtered out, add another step to the pipeline that
    // does so.
    if (!opts.forks) {
      pipeline.push(deforkStream())
    }

    var queryStreamJson = pumpify.obj.apply(this, pipeline)
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

function deforkStream () {
  return collectTransform(function (res) {
    return defork(res).sort(cmpType)
  })
}

var typeOrder = { node: 0, way: 1, relation: 2 }
function cmpType (a, b) {
  return typeOrder[a.type] - typeOrder[b.type]
}
