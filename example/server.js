var osmdb = require('osm-p2p')
var osm = osmdb('/tmp/osm-p2p')

var osmrouter = require('../')
var router = osmrouter(osm)

var http = require('http')
var server = http.createServer(function (req, res) {
  if (router.handle(req, res)) {}
  else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
