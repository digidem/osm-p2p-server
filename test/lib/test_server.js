var http = require('http')
var hyperdb = require('hyperdb')
var hyperosm = require('hyperdb-osm')
var ram = require('random-access-memory')
var Grid = require('grid-point-store')
var memdb = require('memdb')

var osmrouter = require('../../')
var slowdb = require('./slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function testServer (key, cb) {
  if (typeof key === 'function') {
    cb = key
    key = null
  }

  var db
  if (key) db = hyperdb(ram, key, { valueEncoding: 'json' })
  else db = hyperdb(ram, { valueEncoding: 'json' })

  var osm = hyperosm({
    db: db,
    index: DELAY ? slowdb({delay: DELAY}) : memdb(),
    pointstore: Grid({ store: memdb(), zoomLevel: 8 })
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
