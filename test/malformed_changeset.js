var test = require('tape')
var tmpdir = require('os').tmpdir()
var path = require('path')
var osmrouter = require('../')
var http = require('http')
var osmdb = require('osm-p2p')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var base, server

test('setup malformed-changeset upload server', function (t) {
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
    var port = server.address().port
    base = 'http://localhost:' + port + '/api/0.6/'
    t.end()
  })
})

test('send malformed changeset upload', function (t) {
  t.plan(2)
  var href = base + 'changeset/create'
  var hq = hyperquest.put(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.notEqual(res.statusCode, 200, 'malformed xml error code')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.notOk(/^[0-9A-Fa-f]+$/.test(body.trim()), 'not an id')
  }))
  hq.end(`<osm>
    <changeset
      <tag k="comment" v="wow"/>
    </changeset>
  </osm>`)
})

test('teardown malformed-changeset upload server', function (t) {
  server.close()
  t.end()
})
