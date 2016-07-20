var pump = require('pump')

var wrapResponse = require('../transforms/wrap_response.js')
var objToXml = require('../transforms/obj_to_xml.js')

module.exports = function (getElement) {
  return function (req, res, osm, m, next) {
    var r = getElement(m.params.id, osm)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    pump(r, objToXml(), wrapResponse(), res, next)
  }
}
