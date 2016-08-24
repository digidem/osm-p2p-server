/**
 * Download Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Download:_GET_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fdownload
 */
var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  var r = api.getChanges(params.id).on('error', next)
  var t = toOsm({root: 'osmChange', coerceIds: false}).on('error', next)
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  r.pipe(t).pipe(res).on('error', next)
}
