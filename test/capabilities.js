var test = require('tape')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var createServer = require('./test_server.js')

var port, server

test('capabilities.js: setup server', function (t) {
  createServer(function (d) {
    server = d.server
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

test('capabilities.js: teardown server', function (t) {
  server.cleanup()
  t.end()
})
