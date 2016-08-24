/**
 * Download Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Download:_GET_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fdownload
 */
var pump = require('pump')
var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  var r = api.getChanges(params.id)
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  pump(r, toOsm({root: 'osmChange', coerceIds: false}), res, next)
}
