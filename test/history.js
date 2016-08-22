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

test('setup history server', function (t) {
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

var ids = {}, versions = {}, changesets = []
test('create history', function (t) {
  var updates = [
    [
      { type: 'node', lat: 64.5, lon: -121.5, id: 'A' },
      { type: 'node', lat: 63.9, lon: -120.9, id: 'B' }
    ],
    [
      { type: 'node', lat: 64.3, lon: -121.4, id: 'A' }
    ],
    [
      { type: 'node', lat: 64.2, lon: -121.4, id: 'A',
        tags: { beep: 'boop' } }
    ],
    [
      { type: 'node', lat: 63.9, lon: -120.8, id: 'B' }
    ]
  ]
  t.plan(6 * updates.length)
  var exists = {}, versionId = {}
  ;(function next () {
    if (updates.length === 0) return
    var update = updates.shift()
    var hq = hyperquest.put(base + 'changeset/create', {
      headers: { 'content-type': 'text/xml' }
    })
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'text/plain', 'create content type')
    })
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var changeId = body.trim()
      t.ok(/^[0-9A-Fa-f]+$/.test(changeId), 'expected changeset id response')
      changesets.push(changeId)
      upload(changeId, update, next)
    }))
    hq.end('<osm><changeset></changeset></osm>')
  })()

  function upload (changeId, update, next) {
    var hq = hyperquest.post(base + 'changeset/' + changeId + '/upload', {
      headers: { 'content-type': 'text/xml' }
    })
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'text/xml; charset=utf-8', 'upload content type')
    })
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var xml = parsexml(body)
      t.equal(xml.root.name, 'diffResult')
      xml.root.children.forEach(function (c) {
        var key
        if (/^-\d+/.test(c.attributes.old_id)) {
          key = update[-1-Number(c.attributes.old_id)].id
          ids[key] = c.attributes.new_id
          versionId[c.attributes.new_id] = key
        } else {
          key = versionId[c.attributes.old_id]
          versionId[c.attributes.new_id] = key
        }
        if (!versions[key]) versions[key] = []
        versions[key].push(c.attributes.new_version)
      })
      next()
    }))
    hq.end(`<osmChange version="1.0" generator="acme osm editor">
      <create>
        ${update.filter(notExistFilter).map(createMap)}
      </create>
      <modify>
        ${update.filter(existFilter).map(modifyMap)}
      </modify>
    </osmChange>`)
    update.forEach(function (doc) { exists[doc.id] = true })

    function createMap (doc, i) {
      return `<node id="-${i+1}"
        lat="${doc.lat}"
        lon="${doc.lon}"
        changeset="${changeId}"
      >${Object.keys(doc.tags || {}).map(function (key) {
          return `<tag k="${key}" v="${doc.tags[key]}"/>`
        }).join('')}
      </node>`
    }
    function modifyMap (doc) {
      return `<node id="${ids[doc.id]}"
        lat="${doc.lat}" lon="${doc.lon}"
        changeset="${changeId}"
      >${Object.keys(doc.tags || {}).map(function (key) {
          return `<tag k="${key}" v="${doc.tags[key]}"/>`
        }).join('')}
      </node>`
    }
    function existFilter (doc) { return exists[doc.id] }
    function notExistFilter (doc) { return !exists[doc.id] }
  }
})

test('history route', function (t) {
  t.plan(4)
  var hq = hyperquest(base + 'node/' + ids.A + '/history', {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/xml; charset=utf-8')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.deepEqual(xml.root.children, [
      {
        name: 'node',
        attributes: {
          changeset: changesets[2],
          id: ids.A,
          lat: '64.2',
          lon: '-121.4',
          version: versions.A[2]
        },
        children: [
          {
            name: 'tag',
            attributes: {
              k: 'beep',
              v: 'boop'
            },
            children: []
          }
        ],
        content: ''
      },
      {
        name: 'node',
        attributes: {
          changeset: changesets[1],
          id: ids.A,
          lat: '64.3',
          lon: '-121.4',
          version: versions.A[1]
        },
        children: []
      },
      {
        name: 'node',
        attributes: {
          changeset: changesets[0],
          id: ids.A,
          lat: '64.5',
          lon: '-121.5',
          version: versions.A[0]
        },
        children: []
      }
    ])
  }))
})

test('teardown changeset server', function (t) {
  server.close()
  t.end()
})
