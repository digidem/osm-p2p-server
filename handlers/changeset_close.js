/**
 * Close Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Close:_PUT_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fclose
 */

module.exports = function (closeChangeset) {
  return function (req, res, osm, m, next) {
    var parts = m.params.id.split(':')
    var version = parts.length === 2 ? parts[1] : null
    closeChangeset(m.params.id, version, osm, function (err) {
      if (err) return next(err)
      res.end()
    })
  }
}
