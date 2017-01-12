var tmpdir = require('os').tmpdir()
var path = require('path')
var http = require('http')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var osmdb = require('osm-p2p-db')
var memdb = require('memdb')
var hyperlog = require('hyperlog')
var fdstore = require('fd-chunk-store')

var osmrouter = require('../../')
var slowdb = require('./slowdb.js')

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

module.exports = testServer
