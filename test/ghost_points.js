var test = require('tape')
var hyperlog = require('hyperlog')
var memdb = require('memdb')
var path = require('path')
var fdstore = require('fd-chunk-store')
var osmdb = require('osm-p2p-db')
var http = require('http')
var url = require('url')
var concat = require('concat-stream')

var through = require('through2')
var Duplex = require('readable-stream/duplex')
var tmpdir = require('os').tmpdir()
var createGetMap = require('../api/get_map')
var createServer = require('./lib/test_server.js')

function getMap (osm, bbox, done) {
  var getMap = createGetMap(osm)
  getMap(bbox, {order: 'type'}, done)
}

function createOsm () {
  var storefile = path.join(tmpdir, 'osm-store-' + Math.random())
  return osmdb({
    log: hyperlog(memdb(), { valueEncoding: 'json' }),
    db: memdb(),
    store: fdstore(4096, storefile)
  })
}

test('doesn\'t return both forked ways', function (t) {
  t.plan(3)

  // Has the base way
  var osmBase = createOsm()

  // Has a fork of the base way
  var osmForkA = createOsm()

  // Has a different fork of the base way
  var osmForkB = createOsm()

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
    },
  ]

  // 1. Create base way
  var wayId
  var wayVersionId
  var changesetId
  var keyIds
  var forkARefs
  var forkAWayVersionId
  var forkBRefs
  var forkBWayVersionId
  function step1 () {
    createChangeset(osmBase, function (cs) {
      changesetId = cs
      createNodes(osmBase, nodes, cs, function (keys) {
        keyIds = keys
        createWay(osmBase, keys, cs, function (way, wayVersion) {
          wayId = way
          wayVersionId = wayVersion
          step2()
        })
      })
    })
  }

  // 2. Replicate base osm to fork A osm
  function step2 () {
    sync(osmBase.log, osmForkA.log, function (err) {
      step3()
    })
  }

  // 3. Write modifications to fork A
  function step3 () {
    var node = {
      type: 'node',
      lon: 10,
      lat: 10
    }
    createChangeset(osmForkA, function (cs) {
      createNodes(osmForkA, [node], cs, function (keys) {
        var refs = keyIds.concat(keys)
        forkARefs = refs
        updateWay(osmForkA, wayId, wayVersionId, refs, cs, function (way) {
          forkAWayVersionId = way.key
          step4()
        })
      })
    })
  }

  // 4. Replicate base osm to fork B osm
  function step4 () {
    sync(osmBase.log, osmForkB.log, function (err) {
      step5()
    })
  }

  // 5. Write modifications to fork B
  function step5 () {
    var node = {
      type: 'node',
      lon: -10,
      lat: -10
    }
    createChangeset(osmForkB, function (cs) {
      createNodes(osmForkB, [node], cs, function (keys) {
        var refs = keyIds.concat(keys)
        forkBRefs = refs
        updateWay(osmForkB, wayId, wayVersionId, refs, cs, function (way) {
          forkBWayVersionId = way.key
          step6()
        })
      })
    })
  }

  // 6. Replicate fork A and fork B
  function step6 () {
    sync(osmForkA.log, osmForkB.log, function (err) {
      step7()
    })
  }

  // 7. Create an osm-p2p-server instance from fork A
  function step7 () {
    createServer(step8)
  }

  // 8. Replicate fork A and the server
  function step8 (d) {
    sync(d.osm.log, osmForkA.log, function (err) {
      d.osm.ready(function () {
        step9(d)
      })
    })
  }

  // 9. Run an http query on the server to see which way & points are returned
  function step9 (server) {
    var opts = {
      hostname: 'localhost',
      port: url.parse(server.base).port,
      path: '/api/0.6/map?bbox=-90,-90,90,90',
      headers: {
        'Accept': 'application/json'
      }
    }
    http.get(opts, function (res) {
      res.pipe(concat(function (json) {
        var data = JSON.parse(json)
        var nodeIds = data.elements
          .filter(function (elm) { return elm.type === 'node' })
          .map(function (elm) { return elm.id })
        var ways = data.elements.filter(function (elm) { return elm.type === 'way' })

        t.equal(ways.length, 1)

        // Ensure the way present matches one of the two possible forks and its nodes
        if (ways[0].version === forkAWayVersionId) {
          t.equal(ways[0].version, forkAWayVersionId)
          t.deepEqual(nodeIds.sort(), forkARefs.sort())
        } else if (ways[0].version == forkBWayVersionId) {
          t.equal(ways[0].version, forkBWayVersionId)
          t.deepEqual(nodeIds.sort(), forkBRefs.sort())
        } else {
          t.error('unexpected way version id')
        }
      }))
    })
  }

  step1()
})

function eqtype (t) {
  return function (node) { return node.type === t }
}

// creates a list of nodes
function createNodes (osm, nodes, changesetId, done) {
  var keys = []
  ;(function next () {
    var node = nodes.shift()
    if (!node) return done(keys)
    node.changeset = changesetId
    osm.create(node, function (err, key) {
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
    changeset: changesetId
  }, function (err, key, node) {
    done(key, node.key)
  })
}

// updates a changeset with a way and nodes
function updateWay (osm, way, parentId, refs, changesetId, done) {
  osm.put(way, {
    type: 'way',
    refs: refs,
    changeset: changesetId
  },
  { links: [parentId] },
  function (err, way) {
    done(way)
  })
}

// create a new changeset
function createChangeset (osm, done) {
  osm.create({
    type: 'changeset'
  }, function (err, key, node) {
    done(key, node.key)
  })
}

function sync (log1, log2, done) {
  var r1 = log1.replicate()
  r1.on('end', onEnd)
  r1.on('error', onEnd)

  var r2 = log2.replicate()
  r2.on('end', onEnd)
  r2.on('error', onEnd)

  r1.pipe(r2).pipe(r1)

  var pending = 2
  function onEnd (err) {
    if (err) {
      return done(err)
    }
    if (--pending === 0) {
      return done()
    }
  }
}
