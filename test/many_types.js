var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var base
var server
var changeId
var createServer = require('./lib/test_server.js')

test('many_types.js: setup server', function (t) {
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
var keys = {}

test('add docs to changeset', function (t) {
  var docs = [
    { id: 'A', type: 'node', lat: 64.5, lon: -121.5, changeset: changeId },
    { id: 'B', type: 'node', lat: 63.9, lon: -120.9, changeset: changeId },
    { id: 'C', type: 'node', lat: 64.3, lon: -122.1, changeset: changeId },
    { id: 'D', type: 'node', lat: 65.1, lon: -120.9, changeset: changeId },
    { id: 'E', type: 'node', lat: 65.3, lon: -120.8, changeset: changeId },
    { id: 'F', type: 'node', lat: 60.6, lon: -122.3, changeset: changeId },
    { id: 'G', type: 'way', refs: ['A', 'B', 'C'], changeset: changeId },
    { id: 'H', type: 'way', refs: ['D', 'E', 'C'], changeset: changeId },
    { id: 'I',
      type: 'relation',
      changeset: changeId,
      tags: { name: 'Küstenbus Linie 123' },
      members: [
        { type: 'node', ref: 'F' },
        { type: 'way', ref: 'G' },
        { type: 'way', ref: 'H' }
      ]
    }
  ]
  t.plan(docs.length * 4)
  ;(function next () {
    if (docs.length === 0) return
    var doc = docs.shift()
    var key = doc.id
    delete doc.id

    ;(doc.refs || []).forEach(function (ref, i) {
      if (keys[ref]) doc.refs[i] = keys[ref]
    })
    ;(doc.members || []).forEach(function (member) {
      if (keys[member.ref]) member.ref = keys[member.ref]
    })

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
      keys[key] = body.trim()
      next()
    }))
    if (doc.type === 'node') {
      hq.end(`<osm>
        <node changeset="${doc.changeset}"
          lat="${doc.lat}" lon="${doc.lon}"
          id="IGNOREME">
        </node>
      </osm>`)
    } else if (doc.type === 'way') {
      hq.end(`<osm><way changeset="${doc.changeset}">
        ${doc.refs.map(function (ref) {
          return `<nd ref="${ref}" />`
        }).join('')}
      </way></osm>`)
    } else if (doc.type === 'relation') {
      hq.end(`<osm><relation changeset="${doc.changeset}">
        <tag k="name" v="Küstenbus Linie 123"/>
        ${doc.members.map(function (member) {
          return `<member type="${member.type}" ref="${member.ref}"/>`
        }).join('')}
      </relation></osm>`)
    }
  })()
})

test('multi-fetch ways', function (t) {
  t.plan(7)
  var href = base + 'ways?ways=' + keys.G + ',' + keys.H
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
    t.equal(xml.root.children[0].name, 'way')
    t.equal(xml.root.children[1].name, 'way')
    var xids = xml.root.children.map(function (x) {
      return x.attributes.id
    })
    t.deepEqual(xids, [keys.G, keys.H], 'id comparison')
  }))
})

test('get relation', function (t) {
  t.plan(7)
  var href = base + 'relation/' + keys.I
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
    t.equal(xml.root.children[0].name, 'relation')
    var members = xml.root.children[0].children
      .filter(function (x) {
        return x.name === 'member'
      })
      .map(function (x) {
        return { name: x.name, attributes: x.attributes }
      })
    var tags = xml.root.children[0].children
      .filter(function (x) {
        return x.name === 'tag'
      })
      .map(function (x) {
        return { k: x.attributes.k, v: x.attributes.v }
      })
    t.deepEqual(members, [
      { name: 'member', attributes: { type: 'node', ref: keys.F, role: '' } },
      { name: 'member', attributes: { type: 'way', ref: keys.G, role: '' } },
      { name: 'member', attributes: { type: 'way', ref: keys.H, role: '' } }
    ], 'relation members')
    t.deepEqual(tags, [
      { k: 'name', v: 'Küstenbus Linie 123' }
    ], 'relation tags')
  }))
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
    t.equal(xml.root.children[0].name, 'create')
    t.equal(xml.root.children[0].children.length, 9)
    xml.root.children[0].children.forEach(function (c) {
      delete c.attributes.timestamp
    })
    t.deepEqual(chfilter(xml.root.children[0].children).sort(cmpch), [
      { name: 'node',
        attributes: { id: keys.A, changeset: changeId, lat: '64.5', lon: '-121.5' },
        children: []
      },
      {
        name: 'node',
        attributes: { id: keys.B, changeset: changeId, lat: '63.9', lon: '-120.9' },
        children: []
      },
      {
        name: 'node',
        attributes: { id: keys.C, changeset: changeId, lat: '64.3', lon: '-122.1' },
        children: []
      },
      {
        name: 'node',
        attributes: { id: keys.D, changeset: changeId, lat: '65.1', lon: '-120.9' },
        children: []
      },
      {
        name: 'node',
        attributes: { id: keys.E, changeset: changeId, lat: '65.3', lon: '-120.8' },
        children: []
      },
      {
        name: 'node',
        attributes: { id: keys.F, changeset: changeId, lat: '60.6', lon: '-122.3' },
        children: []
      },
      {
        name: 'way',
        attributes: { id: keys.G, changeset: changeId },
        children: [
          { name: 'nd', attributes: { ref: keys.A }, children: [] },
          { name: 'nd', attributes: { ref: keys.B }, children: [] },
          { name: 'nd', attributes: { ref: keys.C }, children: [] }
        ],
        content: ''
      },
      {
        name: 'way',
        attributes: { id: keys.H, changeset: changeId },
        children: [
          { name: 'nd', attributes: { ref: keys.D }, children: [] },
          { name: 'nd', attributes: { ref: keys.E }, children: [] },
          { name: 'nd', attributes: { ref: keys.C }, children: [] }
        ],
        content: ''
      },
      {
        name: 'relation',
        attributes: { id: keys.I, changeset: changeId },
        children: [
          { name: 'member', attributes: { type: 'node', ref: keys.F, role: '' }, children: [] },
          { name: 'member', attributes: { type: 'way', ref: keys.G, role: '' }, children: [] },
          { name: 'member', attributes: { type: 'way', ref: keys.H, role: '' }, children: [] },
          { name: 'tag', attributes: { k: 'name', v: 'Küstenbus Linie 123' }, children: [] },
        ],
        content: ''
      }
    ].sort(cmpch))
  }))
})

test('many_types.js: teardown server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})

function cmpch (a, b) {
  return a.attributes.id < b.attributes.id ? -1 : 1
}

function chfilter (children) {
  children.forEach(function (c) {
    chfilter(c.children)
    delete c.attributes.version
  })
  return children
}
