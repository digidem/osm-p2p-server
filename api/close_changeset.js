var errors = require('../errors')

module.exports = function (osm) {
  return function (id, version, cb) {
    if (arguments.length === 2) {
      cb = version
      version = null
    }

    // TODO: lock this record
    osm.get(id, function (err, docs) {
      if (err) return cb(err)
      if (Object.keys(docs).length === 0) {
        return cb(new errors.NotFound('changeset id: ' + id))
      }
      if (!version && Object.keys(docs).length > 1) {
        // TODO: give more meaningful error when api is used directly.
        return cb(new errors.ForkedChangeset(id))
      }
      var doc = version ? docs[version] : docs[Object.keys(docs)[0]]
      if (!doc) return cb(new errors.NotFound('bla bla changeset id: ' + id + ' version: ' + version))
      if (doc.closedAt || doc.closed_at) {
        return cb(new errors.ClosedChangeset(id, doc.closedAt || doc.closed_at))
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
}
