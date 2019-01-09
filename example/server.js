var kosm = require('kappa-osm')
var kcore = require('kappa-core')
var level = require('level')
var raf = require('random-access-file')

var mkdirp = require('mkdirp')
mkdirp.sync('/tmp/osm-p2p/storage')

var osm = kosm({
  index: level('/tmp/osm-p2p/index', { valueEncoding: 'binary' }),
  core: kcore('/tmp/osm-p2p/core', { valueEncoding: 'json' }),
  storage: function (name, cb) { cb(null, raf('/tmp/osm-p2p/storage/'+name)) }
})

var router = require('../')(osm)

var http = require('http')
var server = http.createServer(function (req, res) {
  if (!router.handle(req, res)) {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
