var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var createServer = require('./test_server.js')

var base, server

test('capabilities.js: setup server', function (t) {
  createServer(function (d) {
    base = d.base
    server = d.server
    t.end()
  })
})

test('capabilities', function (t) {
  t.plan(4)
  hyperquest(base + 'capabilities')
    .once('response', function (res) {
      t.equal(res.statusCode, 200, 'status 200')
      var contentObj = contentType.parse(res)
      t.equal(contentObj.type, 'text/xml', 'media type correct')
      t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
    })
    .pipe(concat({ encoding: 'string' }, function (body) {
      var data = parsexml(body)
      t.equal(data.root.attributes.version, '0.6')
    }))
})

test('capabilities.js: teardown server', function (t) {
  server.cleanup()
  t.end()
})
