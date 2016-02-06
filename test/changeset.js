var test = require('tape')
var request = require('http').request
var tmpdir = require('os').tmpdir()
var path = require('path')
var osmrouter = require('../')
var http = require('http')
var osmdb = require('osm-p2p')
var parsexml = require('nodexml').xml2obj
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var base, server, changeId

test('setup changeset server', function (t) {
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

test('create changeset', function (t) {
  t.plan(3)
  var href = base + 'changeset/create'
  var hq = hyperquest.put(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain')
  })
  hq.pipe(concat(function (body) {
    changeId = body.toString().trim()
    t.ok(/^[0-9A-Fa-f]+$/.test(changeId))
  }))
  hq.end(`<osm>
    <changeset>
      <tag k="comment" v="wow"/>
    </changeset>
  </osm>`)
})

test('add docs to changeset', function (t) {
  var docs = [
    { type: 'node', lat: 64.5, lon: -121.5, changeset: changeId },
    { type: 'node', lat: 63.9, lon: -120.9, changeset: changeId }
  ]
  t.plan(docs.length * 3)
  docs.forEach(function (doc) {
    var href = base + doc.type + '/create'
    var hq = hyperquest.put(href)
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200)
      t.equal(res['content-type'], 'text/plain')
    })
    hq.pipe(concat(function (body) {
      t.ok(/^[0-9A-Fa-f]+$/.test(body.toString().trim()))
    }))
    hq.end(`<osm>
      <node changeset="${doc.changeset}"
        lat="${doc.lat}" lon="${doc.lon}">
      </node>
    </osm>`)
  })
})

test('teardown changeset server', function (t) {
  server.close()
  t.end()
})