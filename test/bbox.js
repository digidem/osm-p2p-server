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

var uploaded = {}
var SIZE = 100
test('add docs to changeset', function (t) {
  t.plan(3)
  var docs = []
  for (var i = 0; i < SIZE; i++) {
    docs.push({
      type: 'node',
      id: 0-i-1,
      lat: 64 + i/SIZE,
      lon: -121 - i/SIZE,
      changeset: changeId
    })
  }
  docs.push({
    type: 'way',
    id: '${0-i-1}',
    changeset: changeId,
    refs: docs.map(function (d, i) { return 0 - (i + 1) })
  })
  var kdocs = {}
  docs.forEach(function (doc,i) {
    kdocs[0-i-1] = doc
  })

  var href = base + 'changeset/' + changeId + '/upload'
  var hq = hyperquest.post(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/xml; charset=utf-8')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'diffResult')
    xml.root.children.forEach(function (node, i) {
      var id = node.attributes.new_id
      uploaded[id] = kdocs[0-i-1]
      uploaded[id].id = id
      if (node.name === 'way') {
        uploaded[id].refs = uploaded[id].refs.map(function (ref) {
          return kdocs[ref].id
        })
      }
    })
  }))
  hq.end(`<osmChange version="1.0">
    <create>
      ${docs.map(function (doc) {
        return `<${doc.type} changeset="${doc.changeset}"
          id="${doc.id}"
          ${doc.lat ? `lat="${doc.lat}"` : ''}
          ${doc.lon ? `lon="${doc.lon}"` : ''}>
          ${(doc.refs || []).map(function (ref) {
            return `<nd ref="${ref}"/>`
          }).join('\n')}
        </${doc.type}>`
      }).join('\n')}
    </create>
  </osmChange>`)
})

test('bbox', function (t) {
  t.plan(6 + SIZE*3)
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
      var node = uploaded[c.attributes.id]
      if (c.name === 'node') {
        t.equal(c.attributes.changeset, node.changeset)
        t.equal(c.attributes.lat, String(node.lat))
        t.equal(c.attributes.lon, String(node.lon))
      } else if (c.name === 'way') {
        t.equal(c.children.length, SIZE, 'way')
        t.deepEqual(c.children.map(function (nd) {
          return nd.attributes.ref
        }), node.refs, 'way refs')
      }
    }
  }))
})

test('teardown bbox server', function (t) {
  server.close()
  t.end()
})
