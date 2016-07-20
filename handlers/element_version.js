var pump = require('pump')

var wrapResponse = require('../transforms/wrap_response.js')
var objToXml = require('../transforms/obj_to_xml.js')

module.exports = function (getElementVersion) {
  return function (req, res, osm, m, next) {
    var r = getElementVersion(m.params.id, m.params.version, osm)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    pump(r, objToXml(), wrapResponse(), res, next)
  }
}
