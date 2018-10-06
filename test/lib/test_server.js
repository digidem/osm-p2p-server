var http = require('http')
var kosm = require('kappa-osm')
var kcore = require('kappa-core')
var memdb = require('memdb')
var ram = require('random-access-memory')

var osmrouter = require('../../')
var slowdb = require('./slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function testServer (cb) {
  var osm = kosm({
    index: DELAY ? slowdb({delay: DELAY}) : memdb(),
    core: kcore(ram, { valueEncoding: 'json' }),
    storage: function (name, cb) { cb(null, ram()) }
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
