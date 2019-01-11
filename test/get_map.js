var test = require('tape')
var http = require('http')
var url = require('url')
var concat = require('concat-stream')

var createServer = require('./lib/test_server.js')

test('do not include points from an excluded way fork', function (t) {
  var nodes = [
    {
      type: 'node',
      lon: 0,
      lat: -1
    },
    {
      type: 'node',
      lon: 0,
      lat: 0
    },
    {
      type: 'node',
      lon: 0,
      lat: 1
    }
  ]

  // Has the base way
  createServer(function (res) {
    var osm = res.osm
    var osmServer = res.server
    var osmBase = res.base
    var nodeKeys = []

    createChangeset(osm, function (err, cs) {
      t.error(err)
      createNodes(osm, nodes, cs, function (nodes) {
        var keys = nodes.map(function (node) { return node.id })
        nodeKeys = keys
        createWay(osm, keys, cs, function (err, way, wayVersion) {
          t.error(err)
          osm.ready(check)
        })
      })
    })

    function check () {
      var opts = {
        hostname: 'localhost',
        port: url.parse(osmBase).port,
        path: '/api/0.6/map?bbox=-90,-90,90,90',
        headers: {
          'Accept': 'application/json'
        }
      }
      http.get(opts, function (res) {
        res.pipe(concat(function (json) {
          var data = JSON.parse(json)
          var elms = data.elements.map(d => d.element)
          var nodeIds = data.elements
            .filter(function (elm) { return elm.element.type === 'node' })
            .map(function (elm) { return elm.id })
          var ways = elms.filter(function (elm) { return elm.type === 'way' })

          t.equal(ways.length, 1)
          t.deepEqual(nodeIds.sort(), nodeKeys.sort())

          osmServer.cleanup(function () {
            t.end()
          })
        }))
      })
    }
  })
})

// creates a list of nodes
function createNodes (osm, nodes, changesetId, done) {
  var keys = []
  ;(function next () {
    var node = nodes.shift()
    if (!node) return done(keys)
    node.changeset = changesetId
    node.timestamp = (new Date()).toISOString()
    osm.create(node, function (err, key) {
      if (err) return done(err)
      keys.push(key)
      next()
    })
  })()
}

// creates a changeset with a way and nodes
function createWay (osm, nodeIds, changesetId, done) {
  osm.create({
    type: 'way',
    refs: nodeIds,
    changeset: changesetId,
    timestamp: (new Date()).toISOString()
  }, function (err, res) {
    done(err, res.id, res.version)
  })
}

// create a new changeset
function createChangeset (osm, done) {
  osm.create({
    type: 'changeset'
  }, function (err, res) {
    done(err, res.id, res.version)
  })
}
