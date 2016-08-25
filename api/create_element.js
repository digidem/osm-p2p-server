var errors = require('../lib/errors')
var util = require('../lib/util')

module.exports = function (osm) {
  return function createElement (element, cb) {
    // TODO: check element schema and whitelist props
    var id = util.generateId()
    var changesetId = element.changeset

    if (!changesetId) {
      return cb(new errors.MissingChangesetId())
    }

    osm.get(changesetId, function (err, docs) {
      if (err) return cb(err)
      if (Object.keys(docs).length === 0) {
        return cb(new errors.MissingChangeset(changesetId))
      }
      var closedAt = Object.keys(docs).reduce(function (p, v) {
        if (p) return p
        return docs[v].closedAt || docs[v].closed_at
      }, false)
      if (closedAt) {
        return cb(new errors.ClosedChangeset(changesetId, closedAt))
      }
      var op = Object.assign(util.nodes2refs(element), {
        timestamp: new Date().toISOString()
      })
      osm.put(id, op, function (err, node) {
        if (err) return cb(err)
        cb(null, id, node)
      })
    })
  }
}
