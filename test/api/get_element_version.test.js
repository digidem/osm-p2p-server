var test = require('tape')
var path = require('path')
var tmpdir = require('os').tmpdir()
var osmdb = require('osm-p2p')

var createGetElementVersion = require('../../api/get_element_version')

test('getElementVersion', t => {
  t.plan(5)
  var testId = '12345'
  var testVersion = 'A'
  var testDoc = {
    value: {v: {refs: [1, 2]}}
  }
  var mockedOsm = { log: {
    get: function (version, cb) {
      t.equal(version, testVersion)
      t.equal(typeof cb, 'function')
      cb(null, testDoc)
    }
  }}
  var getElementVersion = createGetElementVersion(mockedOsm)
  getElementVersion(testId, testVersion, (e, element) => {
    t.equal(element.id, testId)
    t.equal(element.version, testVersion)
    t.deepEqual(element.nodes, testDoc.value.v.refs, 'maps refs to nodes')
  })
})

test('getElement missing error', t => {
  t.plan(3)
  var osm = osmdb(path.join(tmpdir, 'osm-p2p-server-test-' + Math.random()))
  var getElementVersion = createGetElementVersion(osm)
  getElementVersion(12345, 'A', (err, elements) => {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'NotFoundError', 'error type is NotFoundError')
    t.equal(err.status, 404, 'error status code is 404')
  })
})
