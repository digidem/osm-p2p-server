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
var parsexml = require('xml-parser')

var base, server, changeId

test('setup changeset upload server', function (t) {
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

test('create changeset upload', function (t) {
  t.plan(3)
  var href = base + 'changeset/create'
  var hq = hyperquest.put(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'create 200 ok')
    t.equal(res.headers['content-type'], 'text/plain', 'create content type')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    changeId = body.trim()
    t.ok(/^[0-9A-Fa-f]+$/.test(changeId), 'expected changeset id response')
  }))
  hq.end(`<osm>
    <changeset>
      <tag k="comment" v="wow"/>
    </changeset>
  </osm>`)
})

test('add docs to changeset upload', function (t) {
  t.plan(3)

  var href = base + 'changeset/' + changeId + '/upload'
  var hq = hyperquest.put(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/xml')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'diffResult')
    console.log('TODO: check diffResult more')
  }))
  hq.end(`<osmChange version="1.0" generator="acme osm editor">
    <create>
      <node id="-1" changeset="${changeId}" version="" lat="64.5" lon="-121.5"/>
      <node id="-2" changeset="${changeId}" version="" lat="63.9" lon="-120.9"/>
      <way id="-3" changeset="${changeId}" version="">
        <nd ref="-1"/>
        <nd ref="-2"/>
      </way>
    </create>
  </osmChange>`)
})

test('get osmchange doc from upload', function (t) {
  t.plan(4)
  var href = base + 'changeset/' + changeId + '/download'
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osmChange')
    t.equal(xml.root.children.length, 1)
    t.equal(xml.root.children[0].name, 'create')
    t.deepEqual(xml.root.children[0].children.sort(cmpch), [
      {
        name: 'node',
        attributes: {
          changeset: changeId,
          lat: '64.5',
          lon: '-121.5'
        },
        children: [],
        content: ''
      },
      {
        name: 'node',
        attributes: {
          changeset: changeId,
          lat: '63.9',
          lon: '-120.9'
        },
        children: [],
        content: ''
      }
    ].sort(cmpch))
  }))
})

test('teardown changeset upload server', function (t) {
  server.close()
  t.end()
})

function cmpch (a, b) {
  return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1
}