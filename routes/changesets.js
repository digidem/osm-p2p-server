/**
 * Download Changesets
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Download:_GET_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fdownload
 */
var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.end('<osm></osm>')
}
