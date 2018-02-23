var test = require('tape')
var osmdb = require('./test_db')

var validateChangeset = require('../../lib/validate_changeset')

var osm = osmdb()

var versions = {}

test('validateChangeset: setup db', t => {
  t.plan(3)
  var batch0 = [
    { type: 'put', id: 'A', value: { type: 'changeset' } },
    { type: 'put', id: 'B', value: { type: 'changeset' } },
    { type: 'put', id: 'C', value: { type: 'changeset', closed_at: new Date().toISOString() } }
  ]
  osm.batch(batch0, function (err, nodes) {
    t.error(err)
    nodes.forEach(function (node) {
      versions[node.version] = node.key
    })
    osm.put('B', { type: 'changeset', tags: {a: 1} }, {links: [versions.B]}, function (err, doc) {
      t.error(err)
      versions.B1 = doc.key
    })
    osm.put('B', { type: 'changeset', tags: {a: 2} }, {links: [versions.B]}, function (err, doc) {
      t.error(err)
    })
  })
})

test('validateChangeset: unforked existing changeset', t => {
  validateChangeset(osm, 'A', null, function (err) {
    t.error(err, 'doesn\'t return error')
    t.end()
  })
})

test('validateChangeset: unforked existing changeset, invalid version', t => {
  validateChangeset(osm, 'A', 123, function (err) {
    t.true(err instanceof Error, 'returns an error')
    t.end()
  })
})

test('validateChangeset: forked existing changeset, version specified', t => {
  validateChangeset(osm, 'B', versions.B1, function (err) {
    t.error(err, 'doesn\'t return error')
    t.end()
  })
})

test('validateChangeset: closed changeset', t => {
  validateChangeset(osm, 'C', undefined, function (err) {
    t.true(err instanceof Error, 'returns an error')
    t.true(/closed/i.test(err.message), 'closed error')
    t.end()
  })
})
