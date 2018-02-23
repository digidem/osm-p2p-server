// TODO: We are not tracking versions in this test or the original code,
// We need to test on forked data with references

var test = require('tape')
var osmdb = require('./test_db')

var filterSafeDeletes = require('../../lib/filter_deletes')

var osm = osmdb()

function toMember (id) {
  return {
    type: 'node',
    id: id
  }
}

test('filterSafeDeletes: setup db', t => {
  var batch0 = [
    { type: 'put', id: 'A', value: { type: 'node', lat: 64.5, lon: -147.3 } },
    { type: 'put', id: 'B', value: { type: 'node', lat: 63.9, lon: -147.6 } },
    { type: 'put', id: 'C', value: { type: 'node', lat: 64.2, lon: -146.5 } },
    { type: 'put', id: 'D', value: { type: 'node', lat: 64.123, lon: -147.56 } },
    { type: 'put', id: 'E', value: { type: 'way', refs: [ 'A', 'B' ] } },
    { type: 'put', id: 'F', value: { type: 'relation', members: [ 'A', 'C', 'E' ].map(toMember) } },
    { type: 'put', id: 'G', value: { type: 'way', refs: [ 'B', 'C' ] } },
    { type: 'put', id: 'H', value: { type: 'relation', members: [ 'F', 'G', 'I' ].map(toMember) } },
    { type: 'put', id: 'I', value: { type: 'node', lat: 64.1, lon: -147.1 } },
    { type: 'put', id: 'J', value: { type: 'node', lat: 64.2, lon: -147.2 } },
    { type: 'put', id: 'K', value: { type: 'node', lat: 64.3, lon: -147.3 } },
    { type: 'put', id: 'L', value: { type: 'node', lat: 64.4, lon: -147.4 } },
    { type: 'put', id: 'M', value: { type: 'node', lat: 64.5, lon: -147.5 } },
    { type: 'put', id: 'N', value: { type: 'way', refs: [ 'J', 'K', 'L', 'M' ] } }
  ]
  osm.batch(batch0, function (err, nodes) {
    t.error(err)
    t.end()
  })
})

test('filterSafeDeletes: unused node', function (t) {
  var changes = [
    { action: 'delete', type: 'node', id: 'D' }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, changes.length, 'Safe delete is not filtered')
    t.end()
  })
})

test('filterSafeDeletes: used node', function (t) {
  var changes = [
    { action: 'delete', type: 'node', id: 'A' }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.true(err instanceof Error, 'returns an error')
    t.end()
  })
})

test('filterSafeDeletes: used node, ignore with ifUnused', function (t) {
  var changes = [
    { action: 'delete', type: 'node', id: 'A', ifUnused: true }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, 0, 'action is filtered from result')
    t.end()
  })
})

test('filterSafeDeletes: relation used by super-relation', function (t) {
  var changes = [
    { action: 'delete', type: 'relation', id: 'F', ifUnused: true }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, 0, 'action is filtered from result')
    t.end()
  })
})

test('filterSafeDeletes: delete node originally with two references', function (t) {
  var changes = [
    { action: 'modify', type: 'way', id: 'E', nodes: ['A', 'C'] },
    { action: 'modify', type: 'relation', id: 'H', refs: [ 'F', 'I' ] },
    { action: 'delete', type: 'way', id: 'G', ifUnused: true },
    { action: 'delete', type: 'node', id: 'B', ifUnused: true }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, changes.length, 'nothing filtered, all deletes valid')
    t.end()
  })
})

test('filterSafeDeletes: create-modify-delete', function (t) {
  var changes = [
    { action: 'create', type: 'way', id: 'X', nodes: ['A', 'B', 'D'] },
    { action: 'modify', type: 'way', id: 'X', nodes: ['A', 'B', 'C'] },
    { action: 'delete', type: 'node', id: 'D' }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, changes.length, 'Safe delete is not filtered')
    t.end()
  })
})

test('filterSafeDeletes: node unused after changeset modify', function (t) {
  var changes = [
    { action: 'modify', type: 'relation', id: 'H', nodes: ['F', 'G'] },
    { action: 'delete', type: 'node', id: 'I' }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, changes.length, 'delete shouldn\'t be filtered')
    t.end()
  })
})

test('filterSafeDeletes: node unused after changeset delete', function (t) {
  var changes = [
    { action: 'delete', type: 'relation', id: 'H' },
    { action: 'delete', type: 'node', id: 'I' }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, changes.length, 'delete shouldn\'t be filtered')
    t.end()
  })
})

// Passing this test requires the reverseRefs logic, it is not clear whether
// editing clients will create this, but generic osmChange docs (used in diffs)
// certainly can
test('filterSafeDeletes: node used after changeset modify', function (t) {
  var changes = [
    { action: 'modify', type: 'way', id: 'E', nodes: ['A', 'B', 'D'] },
    { action: 'delete', type: 'node', id: 'D', ifUnused: true }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, 1, 'delete is filtered')
    t.end()
  })
})

test('filterSafeDeletes: node used after changeset create', function (t) {
  var changes = [
    { action: 'create', type: 'way', id: 'X', nodes: ['A', 'D'] },
    { action: 'delete', type: 'node', id: 'D', ifUnused: true }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, 1, 'delete is filtered')
    t.end()
  })
})

test('filterSafeDeletes: split way', function (t) {
  var changes = [
    { action: 'modify', type: 'way', id: 'N', nodes: ['J', 'K'] },
    { action: 'delete', type: 'node', id: 'L', ifUnused: true },
    { action: 'delete', type: 'node', id: 'M', ifUnused: true }
  ]
  filterSafeDeletes(osm, changes, function (err, filtered) {
    t.error(err)
    t.equal(filtered.length, changes.length, 'delete shouldn\'t be filtered')
    t.end()
  })
})
