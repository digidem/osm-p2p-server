var collect = require('collect-stream')
var pumpify = require('pumpify')
var mapStream = require('through2-map')
var fromArray = require('from2-array')
var collectTransform = require('../lib/collect-transform-stream')
var filterForkedElements = require('../lib/filter_forked_elements')

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
    var pipeline = [
      osm.queryStream(query, opts),
      checkRefExist(osm),
      mapStream.obj(refs2nodes)
    ]

    // If forks ought to be filtered out, add another step to the pipeline that
    // does so.
    if (!opts.forks) {
      pipeline.push(filterForkedElementsStream())
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

function filterForkedElementsStream () {
  return collectTransform(filterForkedElements)
}
