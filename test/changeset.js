var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var createServer = require('./lib/test_server.js')

var base, server, changeId

test('changeset.js: setup server', function (t) {
  createServer(function (d) {
    base = d.base
    server = d.server
    t.end()
  })
})

test('create changeset', function (t) {
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
  hq.end(`<osm>
    <changeset>
      <tag k="comment" v="whatever"/>
    </changeset>
    <changeset>
      <tag k="cool" v="beans"/>
      <tag k="comment" v="wow"/>
    </changeset>
  </osm>`)
})

test('get empty osmchange doc', function (t) {
  t.plan(5)
  var href = base + 'changeset/' + changeId + '/download'
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'create 200 ok')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osmChange')
    t.equal(xml.root.children.length, 0)
  }))
})

var uploaded = {}
test('add docs to changeset', function (t) {
  var docs = [
    { type: 'node', lat: 64.5, lon: -121.5, changeset: changeId },
    { type: 'node', lat: 63.9, lon: -120.9, changeset: changeId }
  ]
  t.plan(docs.length * 4)
  docs.forEach(function (doc) {
    var href = base + doc.type + '/create'
    var hq = hyperquest.put(href, {
      headers: { 'content-type': 'text/xml' }
    })
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200)
      var contentObj = contentType.parse(res)
      t.equal(contentObj.type, 'text/plain', 'media type correct')
      t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
    })
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      t.ok(/^[0-9A-Fa-f]+$/.test(body.trim()))
      uploaded[doc.lon + ',' + doc.lat] = body.trim()
    }))
    hq.end(`<osm>
      <node changeset="${doc.changeset}"
        lat="${doc.lat}" lon="${doc.lon}"
        id="IGNOREME">
      </node>
    </osm>`)
  })
})

var versions = {}
test('get doc versions', function (t) {
  t.plan(8)
  Object.keys(uploaded).forEach(function (key) {
    var href = base + 'node/' + uploaded[key]
    var hq = hyperquest(href)
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200)
      var contentObj = contentType.parse(res)
      t.equal(contentObj.type, 'text/xml', 'media type correct')
      t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
    })
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var xml = parsexml(body)
      t.equal(xml.root.name, 'osm')

      xml.root.children.forEach(function (c) {
        versions[key] = c.attributes.version
      })
    }))
  })
})

test('get osmchange doc', function (t) {
  t.plan(4)
  var href = base + 'changeset/' + changeId + '/download'
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osmChange')
    t.equal(xml.root.children.length, 1)
    t.equal(xml.root.children[0].name, 'unknown')  // TODO: fixme (should be 'create')
    xml.root.children[0].children.forEach(function (c) {
      delete c.attributes.timestamp
    })
    t.deepEqual(xml.root.children[0].children.sort(cmpch), [
      {
        name: 'node',
        attributes: {
          id: uploaded['-121.5,64.5'],
          version: versions['-121.5,64.5'],
          changeset: changeId,
          lat: '64.5',
          lon: '-121.5'
        },
        children: []
      },
      {
        name: 'node',
        attributes: {
          id: uploaded['-120.9,63.9'],
          version: versions['-120.9,63.9'],
          changeset: changeId,
          lat: '63.9',
          lon: '-120.9'
        },
        children: []
      }
    ].sort(cmpch))
  }))
})

test('changeset.js: teardown server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})

function cmpch (a, b) {
  return a.attributes.id < b.attributes.id ? -1 : 1
}
