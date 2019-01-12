var collect = require('collect-stream')
var pumpify = require('pumpify')
var mapStream = require('through2-map')
var collectTransform = require('collect-transform-stream')
var defork = require('osm-p2p-defork')
var through = require('through2')

var checkRefExist = require('../lib/check_ref_ex.js')

module.exports = function (osm) {
  return function getMap (bbox, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    opts.forks = opts.forks || false
    opts.order = 'type'

    // For now, filter deletions (until downstream can handle them).
    //
    // This also involves removing references to deleted nodes from ways (iD
    // handles this poorly). This relies on the reordering step.
    var nodesSeen = {}
    var deletionFilter = through.obj(function (chunk, enc, next) {
      if (!chunk.deleted) {
        if (chunk.element && chunk.element.type === 'node') {
          nodesSeen[chunk.id] = true
        } else if (chunk.element && chunk.element.type === 'way') {
          chunk.element.refs = (chunk.element.refs || []).filter(function (id) {
            return !!nodesSeen[id]
          })
        }
      }

      if (!chunk.deleted) next(null, chunk)
      else next()
    })

    var pipeline = [
      osm.queryStream ? osm.queryStream(bbox, opts) : osm.query(bbox, opts),
      orderByType(),
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

function orderByType () {
  var queue = { ways: [], relations: [] }
  return through.obj(write, end)
  function write (chunk, enc, next) {
    if (chunk && chunk.element && chunk.element.type === 'way') {
      queue.ways.push(chunk)
      next()
    } else if (chunk && chunk.element && chunk.element.type === 'relation') {
      queue.relations.push(chunk)
      next()
    } else {
      next(null, chunk)
    }
  }
  function end (next) {
    var self = this
    queue.ways.forEach(function (way) {
      self.push(way)
    })
    queue.relations.forEach(function (rel) {
      self.push(rel)
    })
    next()
  }
}

function refs2nodes (doc) {
  var element = { id: doc.id }
  for (var prop in doc.element) {
    if (!doc.element.hasOwnProperty(prop)) continue
    if (prop === 'refs') {
      element.nodes = doc.element.refs
    } else {
      element[prop] = doc.element[prop]
    }
  }
  return element
}
