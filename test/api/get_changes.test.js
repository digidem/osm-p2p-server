var test = require('tape')
var osmdb = require('../lib/test_db')

var createGetChanges = require('../../api/get_changes')
var refs2nodes = require('../../lib/util').refs2nodes

var osm = osmdb()
var getChanges = createGetChanges(osm)

var batch0 = [
  { type: 'put', id: 'A', value: { type: 'node', lat: 1.1, lon: 1.1, changeset: 'X' } },
  { type: 'put', id: 'B', value: { type: 'node', lat: 2.1, lon: 2.1, changeset: 'X' } },
  { type: 'put', id: 'C', value: { type: 'node', lat: 1.2, lon: 1.2, changeset: 'X' } },
  { type: 'put', id: 'D', value: { type: 'way', refs: [ 'A', 'B', 'C' ], changeset: 'X' } },
  { type: 'put', id: 'X', value: { type: 'changeset', tags: { created_by: 'osm-p2p test' } } }
]

var batch1 = [
  { type: 'put', key: 'A', value: { type: 'node', lat: 1.5, lon: 1.1, changeset: 'X' } },
  { type: 'del', key: 'B', value: { changeset: 'X' } }
]

var versions0 = {}
var versions1 = {}

test('setup', t => {
  osm.batch(batch0, function (err, elms) {
    t.error(err)
    elms.forEach(elm => (versions0[elm.id] = elm.version))
    osm.batch(batch1, function (err, elms) {
      t.error(err)
      elms.forEach(elm => (versions1[elm.id] = elm.version))
      t.end()
    })
  })
})

test.skip('getChanges', t => {
  var expected = batch0.slice(0, 4).map(row => Object.assign({},
    row.value, {action: 'create', id: row.id, version: versions0[row.id]})).map(refs2nodes)
  expected.push(Object.assign({}, batch1[0].value,
    {action: 'modify', id: batch1[0].id, version: versions1[batch1[0].id]}))
  expected.push(Object.assign({}, batch0[1].value,
    {action: 'delete', id: batch0[1].id, version: versions1[batch0[1].id]}))
  getChanges('X', function (err, elements) {
    t.error(err)
    t.deepEqual(elements.sort(idcmp), expected.sort(idcmp))
    t.end()
  })
})

test('getChanges no changeset error', t => {
  t.plan(6)
  getChanges('Y', function (err, elements) {
    t.true(err instanceof Error)
    t.equal(err.name, 'NotFoundError')
    t.equal(err.status, 404)
  })
  // check for an id actually in db, but not a changeset id
  getChanges('B', function (err, elements) {
    t.true(err instanceof Error)
    t.equal(err.name, 'NotFoundError')
    t.equal(err.status, 404)
  })
})

function idcmp (a, b) {
  return a.action === b.action
    ? (a.id < b.id ? -1 : 1)
    : cmpt(a.action, b.action)
}
var actions = { create: 0, modify: 1, delete: 2 }
function cmpt (a, b) { return actions[a] - actions[b] }
