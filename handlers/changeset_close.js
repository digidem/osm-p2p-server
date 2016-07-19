/**
 * Close Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Close:_PUT_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fclose
 */

var createError = require('http-errors')

module.exports = function () {
  return function (req, res, osm, m, next) {
    // TODO: lock this record
    var parts = m.params.id.split(':')
    var version = parts.length === 2 ? parts[1] : null
    osm.get(m.params.id, function (err, docs) {
      if (err) return next(err)
      if (Object.keys(docs).length === 0) {
        return next(createError(404, 'not found'))
      }
      if (!version && Object.keys(docs).length > 1) {
        return next(createError(409, 'Cannot close a changeset with multiple forks.\n' +
          'Specify a version explicitly after the id using this syntax:\n' +
          '  PUT /api/0.6/changeset/$ID:$VERSION/close'))
      }
      var doc = version ? docs[version] : docs[Object.keys(docs)[0]]
      if (!doc) return next(createError(404, 'not found'))
      if (doc.closedAt) {
        return next(createError(409, 'The changeset ' + m.params.id +
          ' was closed at ' + doc.closedAt + '.'))
      }
      doc.closedAt = new Date().toISOString()
      osm.put(m.params.id, doc,
        { links: version ? [version] : undefined },
        function (err) {
          if (err) return next(err)
          else res.end()
        }
      )
    })
  }
}
