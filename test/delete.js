var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var base, server, changeId

var createServer = require('./lib/test_server.js')

test('delete.js: setup server', function (t) {
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
      <tag k="comment" v="wow"/>
    </changeset>
  </osm>`)
})

var ids = {}
var versions = {}
test('add docs', function (t) {
  t.plan(5 + 6)

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
  hq.end(`<osmChange version="1.0" generator="acme osm editor">
    <create>
      <node id="-1" changeset="${changeId}" lat="1.0" lon="5.0"/>
      <node id="-2" changeset="${changeId}" lat="2.0" lon="6.0"/>
      <node id="-3" changeset="${changeId}" lat="3.0" lon="7.0"/>
      <way id="-4" changeset="${changeId}">
        <nd ref="-1"/>
        <nd ref="-2"/>
      </way>
      <way id="-5" changeset="${changeId}">

        <nd ref="-3"/>
      </way>
      <node id="-6" changeset="${changeId}" lat="4.0" lon="8.0"/>
    </create>
  </osmChange>`)
})

test('rejected delete', function (t) {
  t.plan(2)

  var href = base + 'node/' + ids['-1']
  var hq = hyperquest.post(href, {
    headers: {
      'content-type': 'text/xml',
      X_HTTP_METHOD_OVERRIDE: 'DELETE'
    }
  })
  hq.on('response', function (res) {
    t.notEqual(res.statusCode, 200)
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.true(body.includes('Element #' + ids['-1'] + ' is still used by element #' + ids['-4'] + '.'))
  }))
  hq.end(`<osm><node id="${ids['-1']}" changeset="${changeId}"/></osm>`)
})

test('list documents', function (t) {
  t.plan(5)

  var href = base + 'map?bbox=0,0,10,10'
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'].split(/\s*;/)[0], 'text/xml')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.deepEqual(xml.root.children[0], {
      name: 'bounds',
      attributes: { minlat: '0', maxlat: '10', minlon: '0', maxlon: '10' },
      children: []
    }, 'bounds')
    var rids = xml.root.children.slice(1).map(function (c) {
      return c.attributes.id
    }).sort()
    t.deepEqual(rids, [
      ids['-1'], ids['-2'], ids['-3'], ids['-4'], ids['-5'], ids['-6']
    ].sort(), 'undeleted documents')
  }))
})

test('accepted delete way', function (t) {
  t.plan(2)

  var href = base + 'way/' + ids['-4']
  var hq = hyperquest.post(href, {
    headers: {
      'content-type': 'text/xml',
      X_HTTP_METHOD_OVERRIDE: 'DELETE'
    }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.ok(/^[0-9A-Fa-f]{8,}$/.test(body.trim()), 'version response')
  }))
  hq.end(`<osm><way id="${ids['-4']}" changeset="${changeId}"/></osm>`)
})

test('accepted delete node', function (t) {
  t.plan(2)

  var href = base + 'node/' + ids['-1']
  var hq = hyperquest.post(href, {
    headers: {
      'content-type': 'text/xml',
      X_HTTP_METHOD_OVERRIDE: 'DELETE'
    }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.ok(/^[0-9A-Fa-f]{8,}$/.test(body.trim()), 'version response')
  }))
  hq.end(`<osm><node id="${ids['-1']}" changeset="${changeId}"/></osm>`)
})

test('list documents', function (t) {
  t.plan(5)

  var href = base + 'map?bbox=0,0,10,10'
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'].split(/\s*;/)[0], 'text/xml')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.deepEqual(xml.root.children[0], {
      name: 'bounds',
      attributes: { minlat: '0', maxlat: '10', minlon: '0', maxlon: '10' },
      children: []
    }, 'bounds')
    var rids = xml.root.children.slice(1).map(function (c) {
      return c.attributes.id
    }).sort()
    t.deepEqual(rids, [
      ids['-2'], ids['-3'], ids['-5'], ids['-6']
    ].sort(), 'undeleted documents')
  }))
})

test('rejected delete type mismatch', function (t) {
  t.plan(1)

  var href = base + 'way/' + ids['-2']
  var hq = hyperquest.post(href, {
    headers: {
      'content-type': 'text/xml',
      X_HTTP_METHOD_OVERRIDE: 'DELETE'
    }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 400)
  })
  hq.end(`<osm><node id="${ids['-2']} changeset="${changeId}""/></osm>`)
})

test('delete.js: teardown server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})
