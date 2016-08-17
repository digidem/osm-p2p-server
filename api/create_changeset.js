var randombytes = require('randombytes')

var obj2P2p = require('../transforms/obj_to_osm_p2p')
var hex2dec = require('../lib/hex2dec.js')

module.exports = function (osm) {
  return function createChangeset (changeset, cb) {
    var id = hex2dec(randombytes(8).toString('hex'))

    changeset.created_at = new Date().toISOString()
    osm.put(id, obj2P2p.fn(changeset), function (err, node) {
      if (err) return cb(err)
      cb(null, id, node)
    })
  }
}
