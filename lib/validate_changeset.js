var errors = require('../errors')

/**
 * Check:
 * 1. A doc with the given id exists in the database
 * 2. If no version is given, doc must not be forked
 * 3. The doc is a changeset
 * 4. The changeset is not closed
 */
module.exports = function validateChangeset (osm, id, version, cb) {
  osm.get(id, function (err, docs) {
    if (err) return cb(err)
    if (docs.length === 0) {
      return cb(new errors.NotFound('changeset #' + id))
    }
    if (!version && docs.length > 1) {
      return cb(new errors.ForkedChangeset())
    }
    var doc = version ? getDocByVersion(docs, version) : docs[0]
    if (!doc) {
      return cb(new errors.NotFound('changeset #' + id + ' version #' + version))
    }
    if (doc.type !== 'changeset') {
      return cb(new errors.NotFound('changeset #' + id))
    }
    if (!doc) return cb(new errors.NotFound('changeset id: #' + id + ' version: #' + version))
    if (doc.closedAt || doc.closed_at) {
      return cb(new errors.ClosedChangeset(id, doc.closedAt || doc.closed_at))
    }
    cb()
  })
}

function getDocByVersion (docs, version) {
  var res = docs.filter(function (doc) {
    return doc.version === version
  })
  return res.length ? res[0] : null
}
