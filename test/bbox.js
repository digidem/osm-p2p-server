var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var createServer = require('./lib/test_server.js')

var base, server, changeId

test('bbox.js: setup changeset server', function (t) {
  createServer(function (d) {
    base = d.base
    server = d.server
    t.end()
  })
})

test('create bbox', function (t) {
  t.plan(4)
  var href = base + 'changeset/create'
  var hq = hyperquest.put(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'create 200 ok')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    changeId = body.trim()
    t.ok(/^[0-9A-Fa-f]+$/.test(changeId), 'expected changeset id response')
  }))
  hq.end('<osm><changeset></changeset></osm>')
})

var uploaded = {}
var SIZE = 100
test('add docs to changeset', function (t) {
  t.plan(4)
  var docs = []
  for (var i = 0; i < SIZE; i++) {
    docs.push({
      type: 'node',
      id: 0 - i - 1,
      lat: 64 + i / SIZE,
      lon: -121 - i / SIZE,
      changeset: changeId
    })
  }
  docs.push({
    type: 'way',
    id: 0 - i - 1,
    changeset: changeId,
    refs: docs.map(function (d, i) { return 0 - (i + 1) })
  })
  var kdocs = {}
  docs.forEach(function (doc, i) {
    kdocs[0 - i - 1] = doc
  })

  var href = base + 'changeset/' + changeId + '/upload'
  var hq = hyperquest.post(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'diffResult')
    xml.root.children.forEach(function (node, i) {
      var id = node.attributes.new_id
      uploaded[id] = kdocs[0 - i - 1]
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
  t.plan(8 + SIZE * 3)
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
    t.deepEqual(xml.root.children[0].attributes, { maxlat: '66', maxlon: '-120', minlat: '63', minlon: '-123' }, 'bounds matches request')
    t.ok(orderedTypes(xml.root.children.map(function (c) {
      return c.name
    })), 'ordered types')

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

test('missing bbox', function (t) {
  t.plan(4)
  var href = base + 'map'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 400)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(body, 'Missing bbox query string parameter')
  }))
})

test('invalid bbox', function (t) {
  t.plan(4)
  var href = base + 'map?bbox=invalid'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 400)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(body, 'Invalid bbox query string parameter')
  }))
})

test('out of range bbox', function (t) {
  t.plan(4)
  var href = base + 'map?bbox=-181,1,2,2'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 400)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(body, 'Invalid bbox query string parameter')
  }))
})

test('bbox json', function (t) {
  t.plan(7 + SIZE * 3)
  var href = base + 'map?bbox=-123,63,-120,66'
  var hq = hyperquest(href, {headers: { 'Accept': 'application/json' }})
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'].split(/\s*;\s*/)[0], 'application/json')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var json = JSON.parse(body)
    t.equal(json.version, 0.6)
    t.deepEqual(json.bounds, { maxlat: 66, maxlon: -120, minlat: 63, minlon: -123 }, 'bounds matches request')
    t.ok(orderedTypes(json.elements.map(function (c) {
      return c.type
    })), 'ordered types')

    for (var i = 0; i < json.elements.length; i++) {
      var c = json.elements[i]
      var node = uploaded[c.id]
      if (c.type === 'node') {
        t.equal(c.changeset, node.changeset)
        t.equal(c.lat, node.lat)
        t.equal(c.lon, node.lon)
      } else if (c.type === 'way') {
        t.equal(c.nodes.length, SIZE, 'way')
        t.deepEqual(c.nodes, node.refs, 'way refs')
      }
    }
  }))
})

test('bbox.js: teardown server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})

function orderedTypes (types) {
  var order = { bounds: 0, node: 0, way: 1, relation: 2 }
  for (var i = 1; i < types.length; i++) {
    if (order[types[i - 1]] > order[types[i]]) return false
  }
  return true
}
