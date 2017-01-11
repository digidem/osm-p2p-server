var cmpFork = require('../lib/util').cmpFork

// Function that consumes an array of OSM elements (ways, nodes, etc) and
// filters out those with duplicate OSM IDs, keeping only the latest element
// for each present OSM ID.
//
// Note that this will also filter out nodes belonging to ways that are
// filtered.
module.exports = function (elements) {
  var latestFirst = elements.sort(cmpFork)
  var nonForkedElements = []
  var keepNodeRefs = {}
  var excludeNodeRefs = {}
  var seen = {}

  // Filter out the non-latest version of each element.
  nonForkedElements = latestFirst.filter(function (element) {
    if (!seen[element.id]) {
      seen[element.id] = true

      // Note that all of the nodes referenced by this way should be kept.
      if (element.type === 'way') {
        element.nodes.forEach(function (ref) {
          keepNodeRefs[ref] = true
        })
      }

      return true
    } else {
      seen[element.id] = true

      // Note that all of the nodes referenced by this way should be culled.
      if (element.type === 'way') {
        element.nodes.forEach(function (ref) {
          excludeNodeRefs[ref] = true
        })
      }

      return false
    }
  })

  // Remove excluded entries that appear in the keep entries.
  Object.keys(keepNodeRefs).forEach(function (ref) {
    if (excludeNodeRefs[ref]) {
      delete excludeNodeRefs[ref]
    }
  })

  // Filter out all nodes that are referenced in filtered ways.
  nonForkedElements = nonForkedElements.filter(function (elm) {
    if (elm.type === 'node' && (keepNodeRefs[elm.id] || !excludeNodeRefs[elm.id])) {
      return true
    } else if (elm.type !== 'node') {
      return true
    } else {
      return false
    }
  })

  // Sort by type
  nonForkedElements.sort(cmpType)

  return nonForkedElements
}

var typeOrder = { node: 0, way: 1, relation: 2 }
function cmpType (a, b) {
  return typeOrder[a.type] - typeOrder[b.type]
}
