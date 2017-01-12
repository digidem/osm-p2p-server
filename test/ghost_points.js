var test = require('tape')
var hyperlog = require('hyperlog')
var memdb = require('memdb')
var path = require('path')
var fdstore = require('fd-chunk-store')
var osmdb = require('osm-p2p-db')
var http = require('http')
var url = require('url')
var concat = require('concat-stream')
var waterfall = require('run-waterfall')

var tmpdir = require('os').tmpdir()
var createServer = require('./lib/test_server.js')
var slowdb = require('./lib/slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function createOsm () {
  var storefile = path.join(tmpdir, 'osm-store-' + Math.random())
  return osmdb({
    log: hyperlog(memdb(), { valueEncoding: 'json' }),
    db: DELAY ? slowdb({delay: DELAY}) : memdb(),
    store: fdstore(4096, storefile)
  })
}

test('do not include points from an excluded way fork', function (t) {
  t.plan(10)

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
    }
  ]

  var wayId
  var wayVersionId
  var keyIds
  var forkARefs
  var forkAWayVersionId
  var forkBRefs
  var forkBWayVersionId
  var osmServer

  // Run the test steps
  waterfall([
    step1,
    step2,
    step3,
    step4,
    step5,
    step6,
    step7,
    step8,
    step9
  ], function (err) {
    t.error(err)
  })

  // 1. Create base way
  function step1 (done) {
    createChangeset(osmBase, function (err, cs) {
      t.error(err)
      createNodes(osmBase, nodes, cs, function (keys) {
        keyIds = keys
        createWay(osmBase, keys, cs, function (err, way, wayVersion) {
          t.error(err)
          wayId = way
          wayVersionId = wayVersion
          done()
        })
      })
    })
  }

  // 2. Replicate base osm to fork A osm
  function step2 (done) {
    sync(osmBase.log, osmForkA.log, done)
  }

  // 3. Write modifications to fork A
  function step3 (done) {
    var node = {
      type: 'node',
      lon: 10,
      lat: 10
    }
    createChangeset(osmForkA, function (err, cs) {
      t.error(err)
      createNodes(osmForkA, [node], cs, function (keys) {
        var refs = keyIds.concat(keys)
        forkARefs = refs
        updateWay(osmForkA, wayId, wayVersionId, refs, cs, function (err, way) {
          t.error(err)
          forkAWayVersionId = way.key
          done()
        })
      })
    })
  }

  // 4. Replicate base osm to fork B osm
  function step4 (done) {
    sync(osmBase.log, osmForkB.log, done)
  }

  // 5. Write modifications to fork B
  function step5 (done) {
    var node = {
      type: 'node',
      lon: -10,
      lat: -10
    }
    createChangeset(osmForkB, function (err, cs) {
      t.error(err)
      createNodes(osmForkB, [node], cs, function (keys) {
        var refs = keyIds.concat(keys)
        forkBRefs = refs
        updateWay(osmForkB, wayId, wayVersionId, refs, cs, function (err, way) {
          forkBWayVersionId = way.key
          done(err)
        })
      })
    })
  }

  // 6. Replicate fork A and fork B
  function step6 (done) {
    sync(osmForkA.log, osmForkB.log, done)
  }

  // 7. Create an osm-p2p-server instance from fork A
  function step7 (done) {
    createServer(function (d) {
      osmServer = d
      done()
    })
  }

  // 8. Replicate fork A and the server
  function step8 (done) {
    sync(osmServer.osm.log, osmForkA.log, function (err) {
      t.error(err)
      osmServer.osm.ready(done)
    })
  }

  // 9. Run an http query on the server to see which way & points are returned
  function step9 (done) {
    var opts = {
      hostname: 'localhost',
      port: url.parse(osmServer.base).port,
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
        } else if (ways[0].version === forkBWayVersionId) {
          t.equal(ways[0].version, forkBWayVersionId)
          t.deepEqual(nodeIds.sort(), forkBRefs.sort())
        } else {
          t.error('unexpected way version id')
        }

        osmServer.server.cleanup(done)
      }))
    })
  }
})

test('no extra points from forks /w 1 deleted node and 1 modified node', function (t) {
  t.plan(11)

  // Has the base way
  var osmBase = createOsm()

  // Has a fork /w a modified point
  var osmForkA = createOsm()

  // Has a fork /w a deleted point
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
    }
  ]

  var wayId
  var wayVersionId
  var keyIds
  var forkBRefs
  var osmServer

  // Run the test steps
  waterfall([
    step1,
    step2,
    step3,
    step4,
    step5,
    step6,
    step7,
    step8,
    step9
  ], function (err) {
    t.error(err)
  })

  // 1. Create base way
  function step1 (done) {
    createChangeset(osmBase, function (err, cs) {
      t.error(err)
      createNodes(osmBase, nodes, cs, function (keys) {
        keyIds = keys
        createWay(osmBase, keys, cs, function (err, way, wayVersion) {
          t.error(err)
          wayId = way
          wayVersionId = wayVersion
          done()
        })
      })
    })
  }

  // 2. Replicate base osm to fork A osm
  function step2 (done) {
    sync(osmBase.log, osmForkA.log, done)
  }

  // 3. Edit the 3rd point on fork A
  function step3 (done) {
    var node = {
      type: 'node',
      lon: 10,
      lat: 10
    }
    createChangeset(osmForkA, function (err, cs) {
      t.error(err)
      createNodes(osmForkA, [node], cs, function (keys) {
        var refs = keyIds.concat([])
        refs[2] = keys[0]
        updateWay(osmForkA, wayId, wayVersionId, refs, cs, function (err, way) {
          t.error(err)
          done()
        })
      })
    })
  }

  // 4. Replicate base osm to fork B osm
  function step4 (done) {
    sync(osmBase.log, osmForkB.log, done)
  }

  // 5. Delete 3rd point on fork B
  function step5 (done) {
    createChangeset(osmForkB, function (err, cs) {
      t.error(err)
      deleteNode(osmForkB, keyIds[2], cs, function (err) {
        t.error(err)
        forkBRefs = keyIds.slice(0, 2)
        updateWay(osmForkB, wayId, wayVersionId, keyIds.slice(0, 2), cs, function (err, way) {
          done(err)
        })
      })
    })
  }

  // 6. Replicate fork A and fork B
  function step6 (done) {
    sync(osmForkA.log, osmForkB.log, done)
  }

  // 7. Create an osm-p2p-server instance from fork A
  function step7 (done) {
    createServer(function (d) {
      osmServer = d
      done()
    })
  }

  // 8. Replicate fork A and the server
  function step8 (done) {
    sync(osmServer.osm.log, osmForkA.log, function (err) {
      t.error(err)
      osmServer.osm.ready(done)
    })
  }

  // 9. Run an http query on the server to see which way & points are returned
  function step9 (done) {
    var opts = {
      hostname: 'localhost',
      port: url.parse(osmServer.base).port,
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

        console.log('data', json.toString())

        // Ensure the way present matches the deleted fork, and the extra node
        // is not returned.
        t.equal(ways.length, 1)
        t.equal(nodeIds.length, 2)
        t.deepEqual(nodeIds.sort(), forkBRefs.sort())

        osmServer.server.cleanup(done)
      }))
    })
  }
})

// creates a list of nodes
function createNodes (osm, nodes, changesetId, done) {
  var keys = []
  ;(function next () {
    var node = nodes.shift()
    if (!node) return done(keys)
    node.changeset = changesetId
    osm.create(node, function (err, key) {
      if (err) return done(err)
      keys.push(key)
      next()
    })
  })()
}

// deletes a node
function deleteNode (osm, nodeId, changesetId, done) {
  var op = {
    type: 'del',
    key: nodeId,
    value: { type: 'node', changeset: changesetId }
  }
  osm.batch([op], done)
}

// creates a changeset with a way and nodes
function createWay (osm, nodeIds, changesetId, done) {
  osm.create({
    type: 'way',
    refs: nodeIds,
    changeset: changesetId
  }, function (err, key, node) {
    done(err, key, node.key)
  })
}

// updates a changeset with a way and nodes
function updateWay (osm, way, parentId, refs, changesetId, done) {
  osm.put(way, {
    type: 'way',
    refs: refs,
    changeset: changesetId,
    timestamp: new Date().getTime()
  },
  { links: [parentId] },
  function (err, way) {
    done(err, way)
  })
}

// create a new changeset
function createChangeset (osm, done) {
  osm.create({
    type: 'changeset'
  }, function (err, key, node) {
    done(err, key, node.key)
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
