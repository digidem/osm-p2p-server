var pump = require('pump')
var Readable = require('readable-stream').Readable

var wrapResponse = require('../transforms/wrap_response.js')
var objToXml = require('../transforms/obj_to_xml.js')

module.exports = function (getElementVersion) {
  return function (req, res, osm, m, next) {
    getElementVersion(m.params.id, m.params.version, osm, function (err, element) {
      if (err) return next(err)
      var r = new Readable({objectMode: true})
      r.push(element)
      r.push(null)
      res.setHeader('content-type', 'text/xml; charset=utf-8')
      pump(r, objToXml(), wrapResponse(), res, next)
    })
  }
}
