var toOsm = require('obj2osm')
var fromArray = require('from2-array')

module.exports = function (req, res, api, params, next) {
  api.getHistory(params.id, function (err, elements) {
    if (err) return next(err)
    var r = fromArray.obj(elements).on('error', next)
    var t = toOsm().on('error', next)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    r.pipe(t).pipe(res)
  })
}
