var randombytes = require('randombytes')

var hex2dec = require('../lib/hex2dec.js')
var errors = require('../lib/errors')

/**
 * Replace placeholder ids with generated unique ids
 * - Any `id` of a created object is considered a placeholder id
 * - Throws an error if placeholder ids are not unique
 * - Does not mutate arguments
 * - cb() with array of changes with ids replaced and an additional
 *   `old_id` prop if the id has been replaced.
 */
module.exports = function replacePlaceholderIds (changes, cb) {
  var idMap = {}
  var dupIds = []
  var changesWithIds = changes.map(function (change) {
    var mapped = Object.assign({}, change)
    if (change.action === 'create') {
      if (idMap[change.id] || !change.id) {
        dupIds.push(change.id)
      }
      var id = hex2dec(randombytes(8).toString('hex'))
      idMap[change.id] = id
      mapped.id = id
      mapped.old_id = change.id
    }
    if (change.type === 'way' && change.nodes) {
      mapped.nodes = change.nodes.map(function (ref) {
        return idMap[ref] || ref
      })
    }
    if (change.type === 'relation' && change.members) {
      mapped.members = change.members.map(function (member) {
        if (!idMap[member.ref]) return Object.assign({}, member)
        return Object.assign({}, member, {ref: idMap[member.ref]})
      })
    }
    return mapped
  })
  if (dupIds.length) {
    var errMsg = '#' + dupIds.join(', #')
    return cb(new errors.PlaceholderIdError(errMsg))
  }
  cb(null, changesWithIds)
}
