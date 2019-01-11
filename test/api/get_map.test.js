var test = require('tape')
var through = require('through2')
var Duplex = require('readable-stream/duplex')
var osmdb = require('../lib/test_db')
var getMap = require('../../api/get_map')

test('getMap', t => {
  t.plan(2)

  var bounds = {
    minLat: 1,
    maxLat: 2,
    minLon: 11,
    maxLon: 12
  }

  var expectedQuery = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]
  var mockedOsm = {
    queryStream: function (query, opts) {
      t.deepEqual(query, expectedQuery, 'calls osm.queryStream with correct query')
      t.deepEqual(opts, {order: 'type', forks: false}, 'calls osm.queryStream with opts order: type')
      return through()
    }
  }
  var osm = osmdb()
  var api = getMap(osm)
  var bbox = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]
  t.equal(typeof api, 'function')
  var s = api(bbox, {order: 'type'})
  t.true(s instanceof Duplex, 'instance of Duplex stream')
})
