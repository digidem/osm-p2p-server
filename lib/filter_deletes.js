// TODO: We do not consider forks and joins here: We need to

var errors = require('../errors')

module.exports = function filterSafeDeletes (osm, batch, cb) {
  // A mapping of ids of ways and relations to
  // the ids of elements that they reference
  var pendingRefs = {}
  // A list of all references to each element within the changeset itself
  // It seems possible that a changeset could modify an element to reference
  // an element that was not previously referenced, and is then deleted
  // later in the changeset. This logic checks for that
  var reverseRefs = {}
  var filtered = []
  var inUseErrors = []
  var pending = batch.length

  batch.forEach(function (change) {
    var id = change.id
    if (change.action !== 'delete' && change.type !== 'node') {
      // Remove previous reverse refs to this element
      ;(pendingRefs[id] || []).forEach(function (ref) {
        reverseRefs[ref] = (reverseRefs[ref] || []).filter(function (ref) {
          return id !== ref
        })
      })
      // If a way or relation is modified, keep a list of the elements
      // they reference, since this overrides what is in the db
      if (change.type === 'way') {
        pendingRefs[id] = change.nodes || []
      } else if (change.type === 'relation') {
        pendingRefs[id] = change.members
          ? change.members.map(function (m) { return m.ref }) : []
      }
      // Add new reverse refs
      ;(pendingRefs[id] || []).forEach(function (ref) {
        reverseRefs[ref] = reverseRefs[ref] || []
        reverseRefs[ref].push(id)
      })
    }
    // If action is not delete it is always included
    if (change.action !== 'delete') {
      filtered.push(change)
      return onCheck()
    }

    /** We only get here for change.action === 'delete' */

    // If a way or relation that appeared in the create or modified block
    // is subsequently deleted, we can remove the references to it
    if (change.type !== 'node') {
      // Remove reverse refs to this element
      ;(pendingRefs[id] || []).forEach(function (ref) {
        reverseRefs[ref] = (reverseRefs[ref] || []).filter(function (ref) {
          return id !== ref
        })
      })
      pendingRefs[id] = []
    }

    // Check whether the element to be deleted is referenced by any
    // existing ways or relations in the database
    refList(osm, id, function (err, refs) {
      if (err) return cb(err)
      // Update the refs from the database with pending refs from the changeset
      var mergedRefs = refs.filter(function (ref) {
        // If the element is referenced in the database by an element
        // that is earlier in the changeset, what is important is
        // whether the new version of the element still references it
        if (pendingRefs[ref.id]) {
          return pendingRefs[ref.id].indexOf(id) > -1
        } else {
          return true
        }
      })
      if (mergedRefs.length || reverseRefs[id] && reverseRefs[id].length) {
        // If there are any references in mergedRefs, then element is in use
        // and cannot be deleted without ...
        if (change.ifUnused) {
          // If the ifUnused prop is set, silently skip and continue
          onCheck()
        } else {
          refs.forEach(function (ref) {
            inUseErrors.push({id: id, usedBy: ref.id})
          })
          onCheck()
        }
      } else {
        // If the element is not referenced anywhere, we can safely delete it
        filtered.push(change)
        onCheck()
      }
    })
  })

  function onCheck () {
    if (--pending > 0) return
    if (!inUseErrors.length) return cb(null, filtered)
    var msg = ''
    inUseErrors.forEach(function (inUse) {
      msg += 'Element #' + inUse.id + ' is still used by element #' + inUse.usedBy + '.'
    })
    cb(new errors.InUse(msg))
  }
}

// work-around to ensure that reference counts are accurate for ifUnused calculation
function refList (osm, id, cb) {
  var res = []
  osm.getReferrers(id, function (err, refs) {
    if (err) return cb(err)
    var pending = 1
    refs.forEach(function (r) {
      var ref = r.id
      pending++
      osm.get(ref, function (err, docs) {
        if (err && !notFound(err)) return cb(err)
        var contained = false
        docs.forEach(function (d) {
          if (d.deleted) return
          if (d.refs && d.refs.indexOf(id) >= 0) {
            contained = true
          } else if (d.nodes && d.nodes.indexOf(id) >= 0) {
            contained = true
          } else if (d.members && d.members.map(refid).indexOf(id) >= 0) {
            contained = true
          }
        })
        if (contained) res.push(r)
        if (--pending === 0) cb(null, res)
      })
    })
    if (--pending === 0) cb(null, res)
  })
}

function refid (m) { return m.ref || m.id }

function notFound (err) {
  return err && (/^notfound/i.test(err) || err.notFound)
}
