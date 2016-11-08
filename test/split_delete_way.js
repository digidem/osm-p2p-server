var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var createServer = require('./lib/test_server.js')

var base, server, changeId, changeId2

test('split_way_delete.js: setup server', function (t) {
  createServer(function (d) {
    base = d.base
    server = d.server
    t.end()
  })
})

test('create changeset (1)', function (t) {
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
  </osm>`)
})

var ids = {}
var versions = {}

test('create way with changeset upload', function (t) {
  t.plan(11)

  var href = base + 'changeset/' + changeId + '/upload'
  var hq = hyperquest.post(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'diffResult')
    t.deepEqual(xml.root.children.map(function (c) {
      return c.attributes.old_id
    }).sort(), ['-1', '-2', '-3', '-4', '-5', '-6'])
    xml.root.children.forEach(function (c) {
      ids[c.attributes.old_id] = c.attributes.new_id
      t.notEqual(c.attributes.old_id, c.attributes.new_id,
        'placeholder id should not equal new id')
      versions[c.attributes.old_id] = c.attributes.new_version
    })
  }))
  hq.end(`<osmChange version="0.6" generator="osm-p2p-server test">
    <create>
      <node id="-1" lat="64.0" lon="-121.0" version="0" changeset="${changeId}"/>
      <node id="-2" lat="64.1" lon="-121.1" version="0" changeset="${changeId}"/>
      <node id="-3" lat="64.2" lon="-121.2" version="0" changeset="${changeId}"/>
      <node id="-4" lat="64.3" lon="-121.3" version="0" changeset="${changeId}"/>
      <node id="-5" lat="64.4" lon="-121.4" version="0" changeset="${changeId}"/>
      <way id="-6" version="0" changeset="${changeId}">
        <nd ref="-1"/>
        <nd ref="-2"/>
        <nd ref="-3"/>
        <nd ref="-4"/>
        <nd ref="-5"/>
      </way>
    </create>
  </osmChange>`)
})

test('check way was correctly created', function (t) {
  var href = base + 'map?bbox=-123,63,-120,66'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'response code correct')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.equal(xml.root.children[0].name, 'bounds')
    var nodes = xml.root.children.filter(c => c.name === 'node')
      .sort((a, b) => Number(a.attributes.lat) - Number(b.attributes.lat))
    var ways = xml.root.children.filter(c => c.name === 'way')
    t.equal(nodes.length, 5, 'correct number of nodes')
    t.equal(ways.length, 1, 'correct number of ways')
    t.equal(ways[0].children.length, 5, 'way has correct number of nodes')
    for (var i = 0; i < nodes.length; i++) {
      t.equal(nodes[i].attributes.id, ids['-' + (i + 1)], 'ids match')
      t.equal(Number(nodes[i].attributes.lat), 64 + i / 10, 'lat correct')
      t.equal(ways[0].children[i].attributes.ref, ids['-' + (i + 1)], 'correct node in way')
    }
    t.end()
  }))
})

test('create changeset (2)', function (t) {
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
    changeId2 = body.trim()
    t.ok(/^[0-9A-Fa-f]+$/.test(changeId2), 'expected changeset id response')
  }))
  hq.end(`<osm>
    <changeset>
      <tag k="comment" v="whatever"/>
    </changeset>
  </osm>`)
})

test('split way and delete half changeset upload', function (t) {
  t.plan(7)

  var href = base + 'changeset/' + changeId2 + '/upload'
  var hq = hyperquest.post(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'diffResult')
    t.deepEqual(xml.root.children.map(function (c) {
      return c.attributes.old_id
    }).sort(), [ids['-6'], ids['-4'], ids['-5']].sort())
    var deleted = xml.root.children.filter(c => !c.attributes.new_id)
    t.deepEqual(deleted.map(c => c.attributes.old_id).sort(), [ids['-4'], ids['-5']].sort(), 'deleted correct')
    var modified = xml.root.children.filter(c => c.attributes.new_id === c.attributes.old_id)
    t.deepEqual(modified.map(c => c.attributes.old_id).sort(), [ids['-6']].sort(), 'modified correct')
    versions.modified_way = modified[0].attributes.new_version
  }))
  hq.end(`<osmChange version="0.6" generator="iD">
    <create/>
    <modify>
      <way id="${ids['-6']}" version="${versions['-6']}" changeset="${changeId2}">
        <nd ref="${ids['-1']}"/>
        <nd ref="${ids['-2']}"/>
        <nd ref="${ids['-3']}"/>
      </way>
    </modify>
    <delete if-unused="true">
      <node id="${ids['-4']}" lat="64.3" lon="-121.3" version="${versions['-4']}" changeset="${changeId2}"/>
      <node id="${ids['-5']}" lat="64.4" lon="-121.4" version="${versions['-5']}" changeset="${changeId2}"/>
    </delete>
  </osmChange>`)
})

test('Check modified way', function (t) {
  var href = base + 'way/' + ids['-6'] + '?forks=true'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'response code correct')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var elements = parsexml(body).root.children
    t.equal(elements.length, 1, 'no forks created')
    t.equal(elements[0].attributes.changeset, changeId2)
    var nodeIds = elements[0].children.map(function (c) { return c.attributes.ref })
    t.deepEqual(nodeIds.sort(), [ids['-1'], ids['-2'], ids['-3']].sort())
    t.end()
  }))
})

test('check bbox with modified way', function (t) {
  var href = base + 'map?bbox=-123,63,-120,66'
  var hq = hyperquest(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'response code correct')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/xml', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    var nodes = xml.root.children.filter(c => c.name === 'node')
      .sort((a, b) => Number(a.attributes.lat) - Number(b.attributes.lat))
    var ways = xml.root.children.filter(c => c.name === 'way')
    t.equal(nodes.length, 3, 'correct number of nodes')
    t.equal(ways.filter(w => w.attributes.id === ids['-6']).length, 1, 'only one version of way in response')
    t.equal(ways[0].children.length, 3, 'way has correct number of nodes')
    for (var i = 0; i < ways[0].children.length; i++) {
      t.equal(nodes[i].attributes.id, ids['-' + (i + 1)], 'ids match')
      t.equal(Number(nodes[i].attributes.lat), 64 + i / 10, 'lat correct')
      t.equal(ways[0].children[i].attributes.ref, ids['-' + (i + 1)], 'correct node in way')
    }
    t.end()
  }))
})

test('split_way_delete.js: teardown server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})
