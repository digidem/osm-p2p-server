var level = require('level')
var hyperlog = require('hyperlog')
var fdstore = require('fd-chunk-store')
var db = {
  log: level('/tmp/osm-p2p/log'),
  index: level('/tmp/osm-p2p/index')
}

var osmdb = require('osm-p2p-db')
var osm = osmdb({
  log: hyperlog(db.log, { valueEncoding: 'json' }),
  db: db.index,
  store: fdstore(4096, '/tmp/osm-p2p/tree')
})

var osmrouter = require('../')
var router = osmrouter(osm)

var http = require('http')
var server = http.createServer(function (req, res) {
  if (router.handle(req, res)) {
  } else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
