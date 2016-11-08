var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var base, server, changeId

var createServer = require('./test_server.js')

test('multi_fetch.js: setup server', function (t) {
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

test('multi-fetch', function (t) {
  t.plan(7)
  var ids = Object.keys(uploaded)
    .map(function (key) { return uploaded[key] })
  var href = base + 'nodes?nodes=' + ids.join(',')
  var hq = hyperquest(href, {
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
    t.equal(xml.root.name, 'osm')
    t.equal(xml.root.children[0].name, 'node')
    t.equal(xml.root.children[1].name, 'node')
    var xids = xml.root.children.map(function (x) {
      return x.attributes.id
    })
    t.deepEqual(xids, ids, 'id comparison')
  }))
})

test('multi-fetch random parameters in query string', function (t) {
  t.plan(7)
  var ids = Object.keys(uploaded)
    .map(function (key) { return uploaded[key] })
  var href = base + 'nodes?foo=bar&nodes=' + ids.join(',')
  var hq = hyperquest(href, {
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
    t.equal(xml.root.name, 'osm')
    t.equal(xml.root.children[0].name, 'node')
    t.equal(xml.root.children[1].name, 'node')
    var xids = xml.root.children.map(function (x) {
      return x.attributes.id
    })
    t.deepEqual(xids, ids, 'id comparison')
  }))
})

test('multi-fetch error', function (t) {
  t.plan(4)
  var ids = Object.keys(uploaded)
    .map(function (key) { return uploaded[key] })
  var href = base + 'nodes?ways=' + ids.join(',')
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.once('response', function (res) {
    t.equal(res.statusCode, 400)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(body.split('\n')[0], 'Missing parameter \'nodes\'.')
  }))
})

test('multi_fetch.js: teardown server', function (t) {
  server.cleanup()
  t.end()
})
