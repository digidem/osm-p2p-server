var qs = require('query-string')
var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  // TODO: Validate bbox
  var bbox = qs.parse(qs.extract(req.url)).bbox.split(',').map(Number)
  var r = api.getMap(bbox)
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.setHeader('content-disposition', 'attachment; filename="map.osm"')
  var toOsmOptions = {
    bounds: {minlon: bbox[0], minlat: bbox[1], maxlon: bbox[2], maxlat: bbox[3]}
  }
  var t = toOsm(toOsmOptions).on('error', next)
  r.pipe(t).pipe(res)
}
