var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  var r = api.getHistory(params.id).on('error', next)
  var t = toOsm().on('error', next)
  r.pipe(t).pipe(res)
}
