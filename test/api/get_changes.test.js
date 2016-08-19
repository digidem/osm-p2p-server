var test = require('tape')
var path = require('path')
var tmpdir = require('os').tmpdir()
var osmdb = require('osm-p2p')

var createGetChanges = require('../../api/get_changes')

var osm = osmdb(path.join(tmpdir, 'osm-p2p-server-test-' + Math.random()))

test('setup', t => {
  var batch0 = [
    { type: 'put', key: 'A', value: { type: 'node', lat: 1.1, lon: 1.1, changeset: 'X' } },
    { type: 'put', key: 'B', value: { type: 'node', lat: 2.1, lon: 2.1, changeset: 'X' } },
    { type: 'put', key: 'C', value: { type: 'node', lat: 1.2, lon: 1.2, changeset: 'X' } },
    { type: 'put', key: 'D', value: { type: 'way', refs: [ 'A', 'B', 'C' ], changeset: 'X' } },
    { type: 'put', key: 'X', value: { type: 'changeset', tags: { created_by: 'osm-p2p test' } } }
  ]
  osm.batch(batch0, function (err, nodes) {
    t.error(err)
    var batch1 = [
      { type: 'put', key: 'A', value: { type: 'node', lat: 1.5, lon: 1.1, changeset: 'X' } },
      { type: 'del', key: 'B', value: { changeset: 'X' } }
    ]
    osm.batch(batch1, function (err, nodes) {
      t.error(err)
      t.end()
    })
  })
})

test('getChanges', t => {
  var getChanges = createGetChanges(osm)
  getChanges('X', function (err, elements) {
    t.error(err)
    console.log(elements)
    t.end()
  })
})
