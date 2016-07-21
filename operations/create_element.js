var randombytes = require('randombytes')
var createError = require('http-errors')

var obj2P2p = require('../transforms/obj_to_osm_p2p')
var hex2dec = require('../lib/hex2dec.js')

module.exports = function createElement (element, osm, cb) {
  var id = hex2dec(randombytes(8).toString('hex'))

  if (/^(node|way|relation)$/.test(element.type) && !element.changeset) {
    return cb(createError(400, 'missing changeset'))
  }

  osm.put(id, obj2P2p.fn(element), function (err, node) {
    if (err) return cb(err)
    cb(null, id, node)
  })
}
