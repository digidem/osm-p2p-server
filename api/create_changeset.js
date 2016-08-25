var util = require('../lib/util')

module.exports = function (osm) {
  return function createChangeset (changeset, cb) {
    // TODO: check changeset schema and ignore illegal props
    var id = util.generateId()

    var op = Object.assign({}, changeset, {
      created_at: new Date().toISOString()
    })
    osm.put(id, op, function (err, node) {
      if (err) return cb(err)
      cb(null, id, node)
    })
  }
}
