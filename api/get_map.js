var collect = require('collect-stream')
var pumpify = require('pumpify')
var mapStream = require('through2-map')
var fromArray = require('from2-array')
var collectTransform = require('../lib/collect-transform-stream')

var cmpFork = require('../lib/util').cmpFork

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

function filterForkedElements (elements) {
  var latestFirst = elements.sort(cmpFork)
  var nonForkedElements = []
  var keepNodeRefs = {}
  var excludeNodeRefs = {}
  var seen = {}

  // Filter out the non-latest version of each element.
  nonForkedElements = latestFirst.filter(function (element) {
    if (!seen[element.id]) {
      seen[element.id] = true

      // Note that all of the nodes referenced by this way should be kept.
      if (element.type === 'way') {
        element.nodes.forEach(function (ref) {
          keepNodeRefs[ref] = true
        })
      }

      return true
    } else {
      seen[element.id] = true

      // Note that all of the nodes referenced by this way should be culled.
      if (element.type === 'way') {
        element.nodes.forEach(function (ref) {
          excludeNodeRefs[ref] = true
        })
      }

      return false
    }
  })

  // Remove excluded entries that appear in the keep entries.
  Object.keys(keepNodeRefs).forEach(function (ref) {
    if (excludeNodeRefs[ref]) {
      delete excludeNodeRefs[ref]
    }
  })

  // Filter out all nodes that are referenced in filtered ways.
  nonForkedElements = nonForkedElements.filter(function (elm) {
    if (elm.type === 'node' && (keepNodeRefs[elm.id] || !excludeNodeRefs[elm.id])) {
      return true
    } else if (elm.type !== 'node') {
      return true
    } else {
      return false
    }
  })

  // Sort by type
  nonForkedElements.sort(cmpType)

  return nonForkedElements
}

var typeOrder = { node: 0, way: 1, relation: 2 }
function cmpType (a, b) {
  return typeOrder[a.type] - typeOrder[b.type]
}
