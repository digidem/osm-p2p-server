var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var isISODate = require('isostring')
var schema = require('mapeo-schema')

var createServer = require('./lib/test_server.js')

var osm, base, server, changeId

test('changeset_upload.js: setup server', function (t) {
  createServer(function (d) {
    base = d.base
    osm = d.osm
    server = d.server
    t.end()
  })
})

var obs = {
  type: 'observation',
  lat: 1,
  lon: 2,
  tags: {
    obs: 'bar'
  },
  attachments: {
    type: 'image/jpeg',
    id: '1'
  },
  metadata: {
    'hello': 'world'
  },
  schemaVersion: 3
}

var version, id

test('create observation', function (t) {
  t.plan(1)
  osm.create(obs, (err, info) => {
    t.error(err)
    version = info.version
    id = info.id
    t.end()
  })
})

test('create changeset upload', function (t) {
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
    changeId = body
    t.ok(/^[0-9A-Fa-f]+$/.test(changeId), 'expected changeset id response')
  }))
  hq.end(`<osm>
    <changeset>
      <tag k="comment" v="wow"/>
    </changeset>
  </osm>`)
})

test('add docs to changeset', function (t) {
  t.plan(13)
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
  var oldv, newv
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'diffResult')
    t.deepEqual(xml.root.children.map(function (c) {
      return c.attributes.old_id
    }).sort(), [id])

    oldv = version
    newv = xml.root.children[0].attributes.new_version
    hyperquest.get(base + 'node/' + version + '/' + newv)
      .on('response', function (res) {
        t.equal(res.statusCode, 200)
      })
      .pipe(concat({ encoding: 'string' }, onnew))
    hyperquest.get(base + 'node/' + version + '/' + oldv)
      .on('response', function (res) {
        t.equal(res.statusCode, 200)
      })
      .pipe(concat({ encoding: 'string' }, onold))
  }))
  hq.end(`<osmChange version="1.0" generator="acme osm editor">
    <modify>
      <node version="${version}" id="${id}" changeset="${changeId}" lat="111" lon="222">
        <tag k="obs" v="foo" />
        <tag k="new" v="yes" />
      </node>
    </modify>
  </osmChange>`)

  function onnew (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.true(isISODate(xml.root.children[0].attributes.timestamp))
    delete xml.root.children[0].attributes.timestamp
    t.deepEqual(xml.root.children, [
      {
        name: 'node',
        attributes: {
          // Lat and lon should not be changed
          lat: '1',
          lon: '2',
          id: id,
          version: newv,
          changeset: changeId
        },
        content: '',
        children: [
          {
            name: 'tag',
            attributes: {
              k: 'obs',
              v: 'foo'
            },
            children: []
          },
          {
            name: 'tag',
            attributes: {
              k: 'new',
              v: 'yes'
            },
            children: []
          }
        ]
      }
    ])
  }
  function onold (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.true(isISODate(xml.root.children[0].attributes.timestamp))
    delete xml.root.children[0].attributes.timestamp
    t.deepEqual(xml.root.children, [
      {
        name: 'node',
        attributes: {
          lat: obs.lat.toString(),
          lon: obs.lon.toString(),
          id: id,
          version: oldv
        },
        children: [
          {
            name: 'tag',
            attributes: {
              k: 'obs',
              v: 'bar'
            },
            children: []
          }
        ],
        content: ''
      }
    ])
  }
})

test('observation intact when queried', function (t) {
  osm.get(id, function (err, docs) {
    t.error(err)
    var element = docs[0]
    schema.validateObservation(element)
    t.deepEquals(obs.attachments, element.attachments)
    t.deepEquals(obs.metadata, element.metadata)
    t.deepEquals(obs.schemaVersion, element.schemaVersion)
    t.end()
  })
})

test('changeset_upload.js: teardown server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})
