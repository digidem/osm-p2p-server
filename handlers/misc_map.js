var qs = require('query-string')
var pump = require('pump')

var wrapResponse = require('../transforms/wrap_response.js')
var objToXml = require('../transforms/obj_to_xml.js')

module.exports = function (getMap) {
  return function (req, res, osm, m, next) {
    // TODO: Validate bbox
    var bbox = qs.parse(qs.extract(req.url)).bbox.split(',').map(Number)
    var r = getMap(bbox, osm)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    res.setHeader('content-disposition', 'attachment; filename="map.osm"')
    res.setHeader('content-encoding', 'identity')
    res.setHeader('cache-control', 'no-cache')
    pump(r, objToXml(), wrapResponse(bbox), res, next)
  }
}
