var qs = require('query-string')
var toOsm = require('obj2osm')
var fromArray = require('from2-array')
var accepts = require('accepts')

var cmpFork = require('../lib/util').cmpFork
var OsmJSONStream = require('../lib/util').OsmJSONStream
var errors = require('../errors')

module.exports = function (req, res, api, params, next) {
  var accept = accepts(req)
  var query = qs.parse(qs.extract(req.url))
  if (!query.bbox) {
    return next(new errors.MissingBbox())
  }
  var bbox = query.bbox.split(',').map(Number)
  if (!isValidBbox(bbox)) {
    return next(new errors.InvalidBbox())
  }
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.setHeader('content-disposition', 'attachment; filename="map.osm"')
  var toOsmOptions = {
    bounds: {minlon: bbox[0], minlat: bbox[1], maxlon: bbox[2], maxlat: bbox[3]}
  }
  if (query.forks) {
    var r = api.getMap(bbox, {order: 'type'})
    var t = toOsm(toOsmOptions).on('error', next)
    return r.pipe(t).pipe(res)
  }
  api.getMap(bbox, function (err, elements) {
    if (err) return next(err)
    var noForks = filterForkElements(elements)
    var byType = noForks.sort(cmpType)
    var r = fromArray.obj(byType).on('error', next)
    var t
    switch (accept.types(['xml', 'json'])) {
      case 'json':
        t = OsmJSONStream(toOsmOptions)
        res.setHeader('content-type', 'application/json; charset=utf-8')
        break
      case 'xml':
      default:
        t = toOsm(toOsmOptions)
        res.setHeader('content-type', 'text/xml; charset=utf-8')
        break
    }
    t.on('error', next)
    r.pipe(t).pipe(res)
  })

  function filterForkElements (elements) {
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
      return elm.type !== 'node' || keepNodeRefs[elm.id]
    })

    return nonForkedElements
  }
}

var typeOrder = { node: 0, way: 1, relation: 2 }
function cmpType (a, b) {
  return typeOrder[a.type] - typeOrder[b.type]
}

function isValidBbox (bbox) {
  return bbox.length === 4 &&
    bbox[0] >= -180 && bbox[0] <= 180 &&
    bbox[2] >= -180 && bbox[2] <= 180 &&
    bbox[1] >= -90 && bbox[1] <= 90 &&
    bbox[3] >= -90 && bbox[3] <= 90
}
