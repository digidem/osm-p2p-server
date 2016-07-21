var createError = require('http-errors')

module.exports = function (id, version, osm, cb) {
  if (arguments.length === 3) {
    cb = osm
    osm = version
    version = null
  }

  // TODO: lock this record
  osm.get(id, function (err, docs) {
    if (err) return cb(err)
    if (Object.keys(docs).length === 0) {
      return cb(createError(404, 'not found'))
    }
    if (!version && Object.keys(docs).length > 1) {
      // TODO: give more meaningful error when api is used directly.
      return cb(createError(409, 'Cannot close a changeset with multiple forks.\n' +
        'Specify a version explicitly after the id using this syntax:\n' +
        '  PUT /api/0.6/changeset/$ID:$VERSION/close'))
    }
    var doc = version ? docs[version] : docs[Object.keys(docs)[0]]
    if (!doc) return cb(createError(404, 'not found'))
    if (doc.closedAt || doc.closed_at) {
      return cb(createError(409, 'The changeset ' + id +
        ' was closed at ' + (doc.closedAt || doc.closed_at) + '.'))
    }
    doc.closed_at = new Date().toISOString()
    osm.put(id, doc,
      { links: version ? [version] : undefined },
      function (err) {
        if (err) return cb(err)
        cb(null)
      }
    )
  })
}
