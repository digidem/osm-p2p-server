var qs = require('query-string')
var fromArray = require('from2-array')

var toOsm = require('../lib/obj2osm')
var cmpFork = require('../lib/util').cmpFork

module.exports = function (req, res, api, params, next) {
  var query = qs.parse(qs.extract(req.url))
  api.getElement(params.id, function (err, forks) {
    if (err) return next(err)
    if (!query.forks) {
      forks = forks.sort(cmpFork).slice(0, 1)
    }
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    var r = fromArray.obj(forks).on('error', next)
    var t = toOsm({bounds: false}).on('error', next)
    r.pipe(t).pipe(res)
  })
}
