var qs = require('query-string')
var pump = require('pump')
var fromArray = require('from2-array')
var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  var query = qs.parse(qs.extract(req.url))
  api.getElement(params.id, function (err, forks) {
    if (err) return next(err)
    if (!query.forks) {
      forks = forks.sort(recentFirst)[0]
    }
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    pump(fromArray.obj(forks), toOsm({bounds: false}), res, next)
  })
}

function recentFirst (a, b) {
  if (a.timestamp && b.timestamp) {
    return b.timestamp - a.timestamp
  }
  // Ensure sorting is stable between requests
  return a.version < b.version ? -1 : 1
}
