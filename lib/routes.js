var h = require('./h.js')
var body = require('body/any')
var randombytes = require('randombytes')
var toxml = require('osm-p2p-xml')
var xmlcreate = require('./xml_create.js')
var xmldiff = require('./xml_diff.js')
var concat = require('concat-stream')

var routes = []
module.exports = routes

function get (u,f) { routes.push(['get',u,f]) }
function post (u,f) { routes.push(['post',u,f]) }
function put (u,f) { routes.push(['put',u,f]) }

get('/api/capabilities', function (req, res, osm) {
  res.end(h('?xml', { version: '1.0', encoding: 'UTF-8' }, [
    h('osm', { version: 0.6, generator: 'osm-p2p' }, [
      h('api', [
        h('version', { minimum: 0.6, maximum: 0.6 }),
        h('area', { maximum: 0.25 }), // in square degrees
        h('waynodes', { maximum: 2000 }),
        h('tracepoints', { per_page: 5000 }),
        h('timeout', { seconds: 300 }),
        h('status', { database: 'online', api: 'online', gpx: 'online' }),
      ])
    ])
  ]))
})

get('/api/0.6/map?*', function (req, res, osm) {
  var bbox = req.url.replace(/[^?]*\?bbox=/,'').split(',').map(Number)
  var q = [[bbox[1],bbox[3]],[bbox[0],bbox[2]]] // left,bottom,right,top
  var r = this.osmdb.queryStream(q)
  r.once('error', function (err) { res.end(err + '\n') })
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.setHeader('content-disposition', 'attachment; filename="map.osm"')
  res.setHeader('content-encoding', 'identity')
  res.setHeader('cache-control', 'no-cache')
  r.pipe(toxml(q)).pipe(res)
})

put('/api/0.6/:type/create', function (req, res, osm, m) {
  var errors = [], ids = []
  req.pipe(concat({ encoding: 'string' }, function (body) {
    if (/\/xml$/.test(req.headers['content-type'])) {
      processOps(xmlcreate(body))
    } else {
      error(400, res, 'unsupported content-type')
    }
  }))

  function processOps (ops) {
    if (ops.length === 0) {
      return error(400, res, 'malformed request')
    }
    if (m.params.type !== 'changeset') {
      ops.splice(1) // discard all but the first element
    }
    // changesets can have multiple ops

    for (var i = 0; i < ops.length; i++) {
      if (/^(node|way|relation)$/.test(ops[i].type)
      && !ops[i].changeset) {
        return error(400, res, 'missing changeset')
      }
    }

    var pending = ops.length
    ops.forEach(function (op) {
      if (op.id) {
        var id = op.id
        delete op.id
        osm.put(id, op, function (err) { oncreate(err, id) })
      } else {
        osm.create(op, oncreate)
      }
    })
    function oncreate (err, id) {
      if (err) errors.push(err)
      else ids.push(id)

      if (--pending === 0) {
        res.setHeader('content-type', 'text/plain')
        res.end(ids.join('\n'))
      }
    }
  }
})

get('/api/0.6/changeset/:id/download', function (req, res, osm, m) {
  osm.getChanges(m.params.id, function (err, ids) {
    if (err) return error(500, res, err)
    var docs = [], pending = ids.length
    ids.forEach(function (id) {
      osm.log.get(id, function (err, doc) {
        if (err) errors.push(err)
        else docs.push(doc)
        if (--pending === 0) {
          res.setHeader('content-type', 'text/xml')
          res.end(render(docs))
        }
      })
    })
  })

  function render (docs) {
    var created = docs.filter(function (doc) {
      return doc.links.length === 0 && doc.value.d === undefined
    })
    var modified = docs.filter(function (doc) {
      return doc.links.length > 0 && doc.value.d === undefined
    })
    var deleted = docs.filter(function (doc) {
      return doc.value.d !== undefined
    })
    return h('osmChange', { version: 0.6, generator: 'osm-p2p' }, [
      created.length && h('create', created.map(docmap)),
      modified.length && h('modify', modified.map(docmap)),
      deleted.length && h('delete', deleted.map(docmap))
    ].filter(Boolean))
  }

  function docmap (doc) {
    var v = doc.value.v
    var type = v.type
    delete v.type
    var tags = v.tags || {}
    var children = Object.keys(tags).map(function (key) {
      return h('tag/', { k: key, v: tags[key] })
    })
    if (type === 'way') {
      ;(v.refs || []).forEach(function (ref) {
        children.push(h('nd/', { ref: ref }))
      })
    } else if (type === 'relation') {
      ;(v.members || []).forEach(function (member) {
        children.push(h('member/', member))
      })
    }
    return h(type, v, children)
  }
})

put('/api/0.6/changeset/:id/upload', function (req, res, osm, m) {
  req.pipe(concat({ encoding: 'string' }, function (body) {
    var xml = xmldiff(body)
    console.log('xml=', xml)
  }))
})

function error (code, res, err) {
  res.statusCode = code
  res.end(err + '\n')
}
