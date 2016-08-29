/**
 * Close Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Close:_PUT_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fclose
 */

module.exports = function (req, res, api, params, next) {
  var parts = params.id.split(':')
  var version = parts.length === 2 ? parts[1] : null
  api.closeChangeset(parts[0], version, function (err) {
    if (err) {
      if (err.name === 'ForkedChangesetError') {
        err.message += '\n specify the version after the id using this syntax:\n' +
          'PUT /api/0.6/changeset/$ID:$VERSION/close'
      }
      return next(err)
    }
    res.end()
  })
}
