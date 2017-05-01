var errors = require('../errors')
var filterSafeDeletes = require('../lib/filter_deletes')
var validateChangeset = require('../lib/validate_changeset')
var replacePlaceholderIds = require('../lib/replace_ids')

module.exports = function (osm) {
  return function (changes, id, version, cb) {
    if (typeof version === 'function') {
      cb = version
      version = null
    }
    // Check changeset with id, version exists + is valid
    validateChangeset(osm, id, version, function (err) {
      if (err) return cb(err)
      // Check each change in changeset references the same changeset
      validateChangesetIds(changes, id, function (err) {
        if (err) return cb(err)
        // Skip any deletes which would break things, or throw an error
        // if `if-unused` is not set on input
        filterSafeDeletes(osm, changes, function (err, filtered) {
          if (err) return cb(err)
          // Replace placeholderIds with UUIDs.
          replacePlaceholderIds(filtered, onProcessed)
        })
      })
    })

    function onProcessed (err, results) {
      if (err) return cb(err)
      var byId = {}
      results.forEach(function (change) {
        byId[change.id] = change
      })
      var batch = results.map(batchMap)
      osm.batch(batch, function (err, nodes) {
        if (err) return cb(err)
        var diffResult = nodes.map(function (node) {
          var id = node.value.k || node.value.d
          var change = byId[id]
          var diff = {
            type: change.type,
            old_id: change.old_id || change.id
          }
          if (change.action !== 'delete') {
            diff.new_id = id
            diff.new_version = node.key
          }
          return diff
        })
        cb(null, diffResult)
      })
    }
  }
}

/**
 * Check that changeset ids in the changes all match the passed id argument
 */
function validateChangesetIds (changes, id, cb) {
  var invalidIds = changes.filter(function (change) {
    return change.changeset !== id
  }).map(function (change) {
    return change.changeset || 'missing'
  })
  if (invalidIds.length) {
    return cb(new errors.ChangesetIdMismatch('#' + invalidIds.join(', #'), '#' + id))
  }
  cb()
}

var SKIP_PROPS = ['action', 'id', 'version', 'ifUnused', 'old_id']

/**
 * Turn a changeset operation into a osm-p2p-db batch operation
 */
function batchMap (change) {
  var op = {
    type: change.action === 'delete' ? 'del' : 'put',
    key: change.id,
    value: {}
  }
  if (change.action === 'create') op.links = []
  if (change.action !== 'create' && change.version) {
    op.links = change.version.split(/\s*,\s*/).filter(Boolean)
  }
  Object.keys(change).forEach(function (prop) {
    if (SKIP_PROPS.indexOf(prop) > -1) return
    op.value[prop === 'nodes' ? 'refs' : prop] = change[prop]
  })
  op.value.timestamp = new Date().toISOString()
  return op
}
