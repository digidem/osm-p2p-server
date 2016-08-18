var randombytes = require('randombytes')

var hex2dec = require('../lib/hex2dec.js')

module.exports = function (osm) {
  return function createChangeset (changeset, cb) {
    // TODO: check changeset schema and ignore illegal props
    var id = hex2dec(randombytes(8).toString('hex'))

    var op = Object.assign({}, changeset, {
      created_at: new Date().toISOString()
    })
    osm.put(id, op, function (err, node) {
      if (err) return cb(err)
      cb(null, id, node)
    })
  }
}
