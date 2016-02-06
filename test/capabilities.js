var test = require('tape')
var request = require('http').request
var tmpdir = require('os').tmpdir()
var path = require('path')
var osmrouter = require('../')
var http = require('http')
var osmdb = require('osm-p2p')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var port, server
test('setup capabilities', function (t) {
  var osm = osmdb(path.join(tmpdir, 'osm-p2p-server-test-' + Math.random()))
  var router = osmrouter(osm)

  server = http.createServer(function (req, res) {
    if (router.handle(req, res)) {}
    else {
      res.statusCode = 404
      res.end('not found\n')
    }
  })
  server.listen(0, function () {
    port = server.address().port
    t.end()
  })
})

test('capabilities', function (t) {
  t.plan(1)
  hyperquest('http://localhost:' + port + '/api/capabilities')
    .pipe(concat({ encoding: 'string' }, function (body) {
      var data = parsexml(body)
      t.equal(data.root.attributes.version, '0.6')
    }))
})

test('teardown capabilities', function (t) {
  server.close()
  t.end()
})
