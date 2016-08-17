var qs = require('query-string')
var pump = require('pump')

var wrapResponse = require('../transforms/wrap_response.js')
var objToXml = require('../transforms/obj_to_xml.js')

module.exports = function (req, res, api, params, next) {
  // TODO: Validate bbox
  var bbox = qs.parse(qs.extract(req.url)).bbox.split(',').map(Number)
  var r = api.getMap(bbox)
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.setHeader('content-disposition', 'attachment; filename="map.osm"')
  pump(r, objToXml(), wrapResponse({bbox: bbox}), res, next)
}
