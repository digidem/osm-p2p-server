var util = require('../lib/util')
var errors = require('../errors')

/**
 * Replace placeholder ids with generated unique ids
 * - Any `id` of a created object is considered a placeholder id
 * - Throws an error if placeholder ids are not unique within types
 * - Does not mutate arguments
 * - cb() with array of changes with ids replaced and an additional
 *   `old_id` prop if the id has been replaced.
 */
module.exports = function replacePlaceholderIds (changes, cb) {
  var idMap = {
    node: {},
    way: {},
    relation: {}
  }
  var dupIds = []
  // First pass to generate ids for the elements that are created.
  // This ensures that by the second pass we have all the ids generated
  // to replace them in the way's nodes.
  var changesWithIds = changes.map(function (change) {
    var mapped = Object.assign({}, change)
    if (change.action === 'create') {
      if (idMap[change.type][change.id] || !change.id) {
        dupIds.push(change.id)
      }
      var id = util.generateId()
      idMap[change.type][change.id] = id
      mapped.id = id
      mapped.old_id = change.id
    }
    return mapped
  })
  // Second pass. Handle id replacement.
  .map(function (change) {
    // no need to Object.assign() here because we have already cloned and can mutate
    if (change.type === 'way' && change.nodes) {
      change.nodes = change.nodes.map(function (ref) {
        return idMap.node[ref] || ref
      })
    }
    if (change.type === 'relation' && change.members) {
      change.members = change.members.map(function (member) {
        if (!idMap[member.type][member.ref]) return Object.assign({}, member)
        return Object.assign({}, member, {ref: idMap[member.type][member.ref]})
      })
    }
    return change
  })
  if (dupIds.length) {
    var errMsg = '#' + dupIds.join(', #')
    return cb(new errors.PlaceholderIdError(errMsg))
  }
  cb(null, changesWithIds)
}
