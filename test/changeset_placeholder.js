var test = require('tape')
var contentType = require('content-type')
var parsexml = require('xml-parser')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var isISODate = require('isostring')

var createServer = require('./lib/test_server.js')

var base, server, changeId

test('changeset_placeholder.js: setup server', function (t) {
  createServer(function (d) {
    base = d.base
    server = d.server
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
test('add docs to changeset upload', function (t) {
  t.plan(8)

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
    }).sort(), ['1', '2', '3'])
    xml.root.children.forEach(function (c) {
      ids[c.attributes.old_id] = c.attributes.new_id
      t.notEqual(c.attributes.old_id, c.attributes.new_id,
        'placeholder id should not equal old id')
      versions[c.attributes.old_id] = c.attributes.new_version
    })
  }))
  hq.end(`<osmChange version="1.0" generator="acme osm editor">
    <create>
      <node id="1" changeset="${changeId}" lat="64.5" lon="-121.5"/>
      <node id="2" changeset="${changeId}" lat="63.9" lon="-120.9"/>
      <way id="3" changeset="${changeId}">
        <nd ref="1"/>
        <nd ref="2"/>
      </way>
    </create>
  </osmChange>`)
})

test('get osmchange doc from upload', function (t) {
  t.plan(7)
  var expected = [
    {
      name: 'node',
      attributes: {
        changeset: changeId,
        id: ids['1'],
        version: versions['1'],
        lat: '64.5',
        lon: '-121.5'
      },
      children: []
    },
    {
      name: 'node',
      attributes: {
        changeset: changeId,
        id: ids['2'],
        version: versions['2'],
        lat: '63.9',
        lon: '-120.9'
      },
      children: []
    },
    {
      name: 'way',
      attributes: {
        changeset: changeId,
        id: ids['3'],
        version: versions['3']
      },
      content: '',
      children: [
        {
          name: 'nd',
          attributes: { ref: ids['2'] },
          children: []
        },
        {
          name: 'nd',
          attributes: { ref: ids['1'] },
          children: []
        }
      ].sort(cmpref)
    }
  ].sort(cmpch)
  var href = base + 'changeset/' + changeId + '/download'
  var hq = hyperquest(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osmChange')
    t.equal(xml.root.children.length, 1)
    t.equal(xml.root.children[0].name, 'create')
    var nodes = xml.root.children[0].children
    nodes.sort(cmpch)
    nodes.forEach(function (c) {
      c.children.sort(cmpref)
    })
    nodes.forEach(function (c) {
      t.true(isISODate(c.attributes.timestamp))
      delete c.attributes.timestamp
    })
    t.deepEqual(nodes, expected)
  }))
})

test('close changeset', function (t) {
  t.plan(2)
  var href = base + 'changeset/' + changeId + '/close'
  var hq = hyperquest.put(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'create 200 ok')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(body.trim(), '', 'empty response')
  }))
  hq.end()
})

test('close already closed changeset', function (t) {
  t.plan(4)
  var href = base + 'changeset/' + changeId + '/close'
  var hq = hyperquest.put(href)
  hq.once('response', function (res) {
    t.equal(res.statusCode, 409, 'expected conflict code')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(
      body.trim().replace(/closed at.*/, 'closed at'),
      'The changeset ' + changeId + ' was closed at',
      'already closed message'
    )
  }))
  hq.end()
})

test('upload to closed changeset', function (t) {
  t.plan(4)
  var href = base + 'changeset/' + changeId + '/upload'
  var hq = hyperquest.post(href, {
    headers: { 'content-type': 'text/xml' }
  })
  hq.on('response', function (res) {
    t.equal(res.statusCode, 409, 'expected conflict code')
    var contentObj = contentType.parse(res)
    t.equal(contentObj.type, 'text/plain', 'media type correct')
    t.equal(contentObj.parameters.charset.toLowerCase(), 'utf-8', 'charset correct')
  })
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    t.equal(
      body.trim().replace(/closed at.*/, 'closed at'),
      'The changeset ' + changeId + ' was closed at',
      'already closed message'
    )
  }))
  hq.end(`<osmChange version="1.0" generator="acme osm editor">
    <create>
      <node id="1" changeset="${changeId}" lat="64.5" lon="-121.5"/>
      <node id="2" changeset="${changeId}" lat="63.9" lon="-120.9"/>
      <way id="3" changeset="${changeId}">
        <nd ref="1"/>
        <nd ref="2"/>
      </way>
    </create>
  </osmChange>`)
})

var secondChangeId
test('create second changeset', function (t) {
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
    secondChangeId = body.trim()
    t.ok(/^[0-9A-Fa-f]+$/.test(secondChangeId), 'expected changeset id response')
  }))
  hq.end(`<osm>
    <changeset>
      <tag k="comment" v="second"/>
    </changeset>
  </osm>`)
})

test('second changeset upload', function (t) {
  t.plan(13)
  var href = base + 'changeset/' + secondChangeId + '/upload'
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
    }).sort(), [ids['1']])

    oldv = versions['1']
    newv = xml.root.children[0].attributes.new_version
    hyperquest.get(base + 'node/' + ids['1'] + '/' + newv)
      .on('response', function (res) {
        t.equal(res.statusCode, 200)
      })
      .pipe(concat({ encoding: 'string' }, onnew))
    hyperquest.get(base + 'node/' + ids['1'] + '/' + oldv)
      .on('response', function (res) {
        t.equal(res.statusCode, 200)
      })
      .pipe(concat({ encoding: 'string' }, onold))
  }))
  hq.end(`<osmChange version="1.0" generator="acme osm editor">
    <modify>
      <node id="${ids['1']}" changeset="${secondChangeId}" lat="111" lon="222"/>
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
          changeset: secondChangeId,
          lat: '111',
          lon: '222',
          id: ids['1'],
          version: newv
        },
        children: []
      }
    ])
  }
  function onold (body) {
    var xml = parsexml(body)
    t.equal(xml.root.name, 'osm')
    t.true(isISODate(xml.root.children[0].children[0].attributes.timestamp))
    delete xml.root.children[0].children[0].attributes.timestamp
    t.deepEqual(xml.root.children[0].children, [
      {
        name: 'node',
        attributes: {
          changeset: changeId,
          lat: '64.5',
          lon: '-121.5',
          id: ids['1'],
          version: oldv
        },
        children: []
      }
    ])
  }
})

test('changeset_placeholder.js: setup server', function (t) {
  server.cleanup(function () {
    t.end()
  })
})

function cmpch (a, b) {
  return a.attributes.id < b.attributes.id ? -1 : 1
}

function cmpref (a, b) {
  return a.attributes.ref < b.attributes.ref ? -1 : 1
}
