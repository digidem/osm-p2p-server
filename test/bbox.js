var test = require('tape')
var tmpdir = require('os').tmpdir()
var path = require('path')
var osmrouter = require('../')
var http = require('http')
var osmdb = require('osm-p2p')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var base, server, changeId

test('setup bbox server', function (t) {
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

test('create bbox', function (t) {
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
  hq.end(`<osm><changeset></changeset></osm>`)
})

var uploaded = []
var SIZE = 500
test('add docs to changeset', function (t) {
  var docs = []
  for (var i = 0; i < SIZE; i++) {
    docs.push({
      type: 'node',
      lat: 64 + i/SIZE,
      lon: -121 - i/SIZE,
      changeset: changeId
    })
  }
  docs.push({
    type: 'way',
    changeset: changeId,
    refs: docs.map(function (d, i) { return 0 - (i + 1) })
  })
  t.plan(docs.length * 3)

  docs.forEach(function (doc, index) {
    var href = base + doc.type + '/create'
    var hq = hyperquest.put(href, {
      headers: { 'content-type': 'text/xml' }
    })
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200)
      t.equal(res.headers['content-type'], 'text/plain')
    })
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      t.ok(/^[0-9A-Fa-f]+$/.test(body.trim()))
      if (doc.type === 'node') {
        doc.id = body.trim()
        uploaded[index] = doc
      }
    }))
    hq.end(`<osm>
      <${doc.type} changeset="${doc.changeset}"
        ${doc.lat ? `lat="${doc.lat}"` : ''}
        ${doc.lon ? `lon="${doc.lon}"` : ''}>
        ${(doc.refs || []).map(function (ref) {
          return `<nd ref="${ref}"/>`
        }).join('\n')}
      </${doc.type}>
    </osm>`)
  })
})

test('bbox', function (t) {
  //t.plan(5 + SIZE*4)
  t.plan(4 + SIZE*4)
  var href = base + 'map?bbox=-123,63,-120,66'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'].split(/\s*;\s*/)[0], 'text/xml')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.equal(xml.root.children[0].name, 'bounds')
    var ui = 0
    for (var i = 1; i < xml.root.children.length; i++) {
      var c = xml.root.children[i]
      if (c.name === 'node') {
        var node = uploaded[ui++]
        t.equal(c.attributes.changeset, node.changeset)
        t.equal(c.attributes.id, node.id)
        t.equal(c.attributes.lat, String(node.lat))
        t.equal(c.attributes.lon, String(node.lon))
      } else if (c.name === 'way') {
        // there should be a way here...
        t.equal(c.children.length, SIZE)
      }
    }
  }))
})

test('teardown bbox server', function (t) {
  server.close()
  t.end()
})

function cmpch (a, b) {
  return a.attributes.id < b.attributes.id ? -1 : 1
}
