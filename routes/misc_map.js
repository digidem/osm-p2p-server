var qs = require('query-string')
var toOsm = require('obj2osm')
var accepts = require('accepts')

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

  var source = api.getMap(bbox, {order: 'type', forks: query.forks})

  var formatTransform
  switch (accept.types(['xml', 'json'])) {
    case 'json':
      formatTransform = OsmJSONStream(toOsmOptions)
      res.setHeader('content-type', 'application/json; charset=utf-8')
      break
    case 'xml':
    default:
      formatTransform = toOsm(toOsmOptions)
      res.setHeader('content-type', 'text/xml; charset=utf-8')
      break
  }
  formatTransform.on('error', next)
  source.pipe(formatTransform).pipe(res)
}

function isValidBbox (bbox) {
  return bbox.length === 4 &&
    bbox[0] >= -180 && bbox[0] <= 180 &&
    bbox[2] >= -180 && bbox[2] <= 180 &&
    bbox[1] >= -90 && bbox[1] <= 90 &&
    bbox[3] >= -90 && bbox[3] <= 90
}
