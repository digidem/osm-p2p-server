var tmpdir = require('os').tmpdir()
var path = require('path')
var http = require('http')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var osmdb = require('osm-p2p-db')
var memdb = require('memdb')
var hyperlog = require('hyperlog')
var fdstore = require('fd-chunk-store')
var EventEmitter = require('events').EventEmitter

var osmrouter = require('../../')
var DELAY = process.env.OSM_P2P_DB_DELAY

function testServer (cb) {
  var dir = path.join(tmpdir, 'osm-p2p-server-test-' + Math.random())
  mkdirp.sync(dir)

  var osm = osmdb({
    db: DELAY ? slowdb({delay: DELAY}) : memdb(),
    log: hyperlog(memdb(), { valueEncoding: 'json' }),
    store: fdstore(4096, path.join(dir, 'kdb'))
  })
  var router = osmrouter(osm)

  var server = http.createServer(function (req, res) {
    if (router.handle(req, res)) {
    } else {
      res.statusCode = 404
      res.end('not found\n')
    }
  })
  server.cleanup = function (cb) {
    server.close()
    rimraf.sync(dir)
    cb()
  }
  server.listen(0, function () {
    var port = server.address().port
    var base = 'http://localhost:' + port + '/api/0.6/'
    cb({
      server: server,
      osm: osm,
      base: base
    })
  })
}

function slowdb (opts) {
  opts = opts || {}
  var delay = opts.delay || 100
  var db = memdb()
  var slowdb = new EventEmitter()
  slowdb.setMaxListeners(Infinity)
  slowdb.db = {}
  slowdb.db.get = function (key, opts, cb) {
    setTimeout(function () {
      db.db.get(key, opts, cb)
    }, Math.random() * delay)
  }
  slowdb.db.put = function (key, value, opts, cb) {
    setTimeout(function () {
      db.db.put(key, value, opts, cb)
    }, Math.random() * delay)
  }
  slowdb.db.del = db.db.del.bind(db.db)
  slowdb.db.batch = db.db.batch.bind(db.db)
  slowdb.db.iterator = db.db.iterator.bind(db.db)
  slowdb.get = db.get.bind(db)
  slowdb.put = db.put.bind(db)
  slowdb.del = db.del.bind(db)
  slowdb.batch = db.batch.bind(db)
  slowdb.createReadStream = db.createReadStream.bind(db)
  slowdb.isOpen = db.isOpen.bind(db)
  db.on('open', slowdb.emit.bind(slowdb, 'open'))
  return slowdb
}

module.exports = testServer
