var qs = require('query-string')
var toOsm = require('obj2osm')
var fromArray = require('from2-array')

var cmpFork = require('../lib/util').cmpFork

module.exports = function (req, res, api, params, next) {
  // TODO: Validate bbox
  var query = qs.parse(qs.extract(req.url))
  var bbox = query.bbox.split(',').map(Number)
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
    var latestFirst = elements.sort(cmpFork)
    var noForks = []
    var seen = {}
    latestFirst.forEach(function (element) {
      if (!seen[element.id]) noForks.push(element)
      seen[element.id] = true
    })
    var byType = noForks.sort(cmpType)
    var r = fromArray.obj(byType).on('error', next)
    var t = toOsm(toOsmOptions).on('error', next)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    r.pipe(t).pipe(res)
  })
}

var typeOrder = { node: 0, way: 1, relation: 2 }
function cmpType (a, b) {
  return typeOrder[a.type] - typeOrder[b.type]
}
