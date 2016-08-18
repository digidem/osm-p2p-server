var pump = require('pump')
var fromArray = require('from2-array')

var wrapResponse = require('../transforms/wrap_response.js')
var objToXml = require('../transforms/obj_to_xml.js')

module.exports = function (req, res, api, params, next) {
  api.getElement(params.id, function (err, forks) {
    if (err) return next(err)
    if (!params.forks) {
      forks = forks.sort(recentFirst)[0]
    }
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    pump(fromArray.obj(forks), objToXml(), wrapResponse(), res, next)
  })
}

function recentFirst (a, b) {
  if (a.timestamp && b.timestamp) {
    return b.timestamp - a.timestamp
  }
  // Ensure sorting is consistent between requests
  return a.version < b.version ? -1 : 1
}
