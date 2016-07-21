var randombytes = require('randombytes')
var createError = require('http-errors')

var obj2P2p = require('../transforms/obj_to_osm_p2p')
var hex2dec = require('../lib/hex2dec.js')

module.exports = function createElement (element, osm, cb) {
  var id = hex2dec(randombytes(8).toString('hex'))
  var changesetId = element.changeset

  if (!changesetId) {
    return cb(createError(400, 'missing changeset ID: the element must have' +
      'a changeset attribute with the id of an open changset'))
  }

  osm.get(changesetId, function (err, docs) {
    if (err) return cb(err)
    if (Object.keys(docs).length === 0) {
      return cb(createError(400, 'changeset ' + changesetId + 'not found.\n' +
        'The element must reference an existing changeset.'))
    }
    var closedAt = Object.keys(docs).reduce(function (p, v) {
      if (p) return p
      return docs[v].closedAt || docs[v].closed_at
    }, false)
    if (closedAt) {
      return cb(createError(409, 'The changeset ' + changesetId +
        ' was closed at ' + closedAt + '.'))
    }
    element.timestamp = element.timestamp || new Date().toISOString()
    osm.put(id, obj2P2p.fn(element), function (err, node) {
      if (err) return cb(err)
      cb(null, id, node)
    })
  })
}
