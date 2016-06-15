var h = require('./h.js')
var body = require('body/any')
var randombytes = require('randombytes')
var toxml = require('osm-p2p-xml')
var xmlcreate = require('./xml_create.js')
var xmldiff = require('./xml_diff.js')
var concat = require('concat-stream')
var xtend = require('xtend')
var collect = require('collect-stream')
var hex2dec = require('./hex2dec.js')

var routes = []
module.exports = routes

function get (u,f) { routes.push(['get',u,f]) }
function post (u,f) { routes.push(['post',u,f]) }
function put (u,f) { routes.push(['put',u,f]) }

get('/api/(0.6)?/capabilities', function (req, res, osm) {
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
  var r = osm.queryStream(q)
  r.once('error', function (err) { res.end(err + '\n') })
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.setHeader('content-disposition', 'attachment; filename="map.osm"')
  res.setHeader('content-encoding', 'identity')
  res.setHeader('cache-control', 'no-cache')
  r.pipe(toxml(q)).pipe(res)
})

put('/api/0.6/:type(node|way|relation|changeset)/create', function (req, res, osm, m) {
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

    if (m.params.type === 'changeset') {
      var id = hex2dec(randombytes(8).toString('hex'))
      var value = { type: 'changeset', tags: {} }
      ops.forEach(function (op) {
        value.tags = xtend(value.tags, op.tags || {})
      })
      osm.batch([
        { type: 'put', key: id, value: value }
      ], onbatch)
    } else {
      osm.batch(ops.map(function (op) {
        var id = hex2dec(randombytes(8).toString('hex'))
        return { type: 'put', key: id, value: op }
      }), onbatch)
    }

    function onbatch (err, nodes) {
      if (err) return error(500, res, err)
      var ids = nodes.map(function (node) {
        return node.value.k
      })
      res.setHeader('content-type', 'text/plain')
      res.end(ids.join('\n'))
    }
  }
})

get('/api/0.6/changeset/:id/download', function (req, res, osm, m) {
  osm.getChanges(m.params.id, function (err, ids) {
    if (err) return error(500, res, err)
    var docs = [], pending = ids.length
    if (!ids.length) {
      res.setHeader('content-type', 'text/xml')
      res.end(render([]))
      return
    }
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
    delete v.tags
    if (type === 'way') {
      ;(v.refs || []).forEach(function (ref) {
        children.push(h('nd/', { ref: ref }))
      })
      delete v.refs
    } else if (type === 'relation') {
      ;(v.members || []).forEach(function (member) {
        children.push(h('member/', member))
      })
      delete v.members
    }
    return h(type, xtend(v, {
      id: doc.value.k,
      version: doc.key
    }), children)
  }
})

get('/api/0.6/:type(node|way|relation)/:id/history', function (req, res, osm, m) {
  res.setHeader('content-type', 'text/xml')
  var rh = osm.kv.createHistoryStream(m.params.id)
  collect(rh, function (err, rows) {
    if (err) return error(500, res, err)
    res.end(h('osm', rows.map(function (row) {
      return renderElem(xtend(row.value, {
        id: row.key,
        version: row.link
      }))
    })))
  })
})

get('/api/0.6/:type(node|way|relation)/:id/:version', function (req, res, osm, m) {
  osm.log.get(m.params.version, function (err, doc) {
    if (err && (/^notfound/.test(err) || err.notFound)) {
      return error(404, res, 'not found')
    }
    if (err) return error(500, res, err)
    res.setHeader('content-type', 'text/xml')
    res.end(h('osm', [
      renderElem(xtend(doc.value.v, {
        id: m.params.id,
        version: m.params.version
      }))
    ]))
  })
})

get('/api/0.6/:type(node|way|relation)\\?:param=:ids', function (req, res, osm, m) {
  if (m.params.type !== m.params.param) {
    return error(400, res, 'type must match param field')
  }
  var ids = m.params.ids.split(',')
  res.setHeader('content-type', 'text/xml')
  var results = [], pending = ids.length + 1
  ids.forEach(function (id) {
    osm.get(id, function (err, docs) {
      Object.keys(docs || {}).forEach(function (key) {
        results.push(xtend(docs[key], {
          id: id,
          version: key
        }))
      })
      if (--pending === 0) done()
    })
  })
  if (--pending === 0) done()

  function done () {
    res.setHeader('content-type', 'text/xml')
    res.end(h('osm', results.map(renderElem)))
  }
})

get('/api/0.6/:type(node|way|relation)/:id', function (req, res, osm, m) {
  osm.get(m.params.id, function (err, docs) {
    if (err) return error(500, res, err)
    if (Object.keys(docs).length === 0) return error(404, res, 'not found')
    res.setHeader('content-type', 'text/xml')
    res.end(h('osm', Object.keys(docs).map(function (key) {
      return renderElem(xtend(docs[key], {
        id: m.params.id,
        version: key
      }))
    })))
  })
})

get('/api/0.6/:type(nodes|ways|relations)\\?:ktype=:ids', function (req, res, osm, m) {
  if (m.params.type !== m.params.ktype) {
    return error(400, res, 'query parameter must match url type')
  }
  var ids = m.params.ids.split(',')
  var results = []
  var pending = 1
  var sent = false
  ids.forEach(function (id, i) {
    pending++
    osm.get(id, function (err, docs) {
      if (sent) return
      if (err) {
        sent = true
        return error(500, res, err)
      }
      results[i] = []
      Object.keys(docs).forEach(function (key) {
        results[i].push(renderElem(xtend(docs[key], {
          id: id,
          version: key
        })))
      })
      if (--pending === 0) done()
    })
  })
  if (--pending === 0) done()

  function done () {
    var docs = []
    results.forEach(function (group) {
      group.forEach(function (g) {
        docs.push(g)
      })
    })
    res.setHeader('content-type', 'text/xml')
    res.end(h('osm', docs))
  }
})

post('/api/0.6/changeset/:id/upload', function (req, res, osm, m) {
  var results = []
  var parts = m.params.id.split(':')
  var version = parts.length === 2 ? parts[1] : null
  osm.get(m.params.id, function (err, docs) {
    if (err) return error(500, res, err)
    if (Object.keys(docs).length === 0) {
      return error(404, res, 'not found')
    }
    if (!version && Object.keys(docs).length > 1) {
      return error(409, res,
        'Cannot upload to a changeset with multiple forks.\n'
        + 'Specify a version explicitly after the id using this syntax:\n'
        + '  PUT /api/0.6/changeset/$ID:$VERSION/close')
    }
    var doc = version ? docs[version] : docs[Object.keys(docs)[0]]
    if (!doc) return error(404, res, 'not found')
    if (doc.closedAt) {
      return error(409, res, 'The changeset ' + m.params.id
        + ' was closed at ' + doc.closedAt + '.')
    }
    req.pipe(concat({ encoding: 'string' }, onbody))
  })

  function onbody (body) {
    var ops = xmldiff(body)
    var batch = [], onid = {}
    ops.create.forEach(function (op) {
      var id = op.id, oldId = op.oldId
      delete op.id
      delete op.oldId
      delete op.version
      batch.push({
        type: 'put',
        key: id,
        value: op
      })
      onid[id] = function (node) {
        results.push({
          type: op.type,
          attr: {
            old_id: oldId,
            new_id: id,
            new_version: node.key
          }
        })
      }
    })
    ops.modify.forEach(function (op) {
      var id = op.id, oldId = op.oldId
      delete op.id
      delete op.oldId
      var links = op.version !== undefined
        ? (op.version || '').split(/\s*,\s*/).filter(Boolean)
        : undefined
      delete op.version
      batch.push({
        type: 'put',
        key: id,
        value: op,
        links: links
      })
      onid[id] = function (node) {
        results.push({
          type: op.type,
          attr: {
            old_id: oldId,
            new_id: id,
            new_version: node.key
          }
        })
      }
    })
    ops.delete.forEach(function (op) {
      var links = op.version !== undefined
        ? (op.version || '').split(/\s*,\s*/).filter(Boolean)
        : undefined
      batch.push({
        type: 'del',
        id: op.id,
        links: links
      })
      results.push({
        type: op.type,
        attr: { old_id: op.oldId }
      })
    })
    osm.batch(batch, function (err, nodes) {
      if (err) return error(500, res, err)
      nodes.forEach(function (node) {
        var id = node.value.k
        if (onid.hasOwnProperty(id)) {
          onid[id](node)
        }
      })
      res.setHeader('content-type', 'text/xml')
      res.end(h('diffResult',
        { generator: 'osm-p2p-server', version: '0.6' },
        results.map(function (r) {
          return h(r.type, r.attr)
        })
      ))
    })
  }
})

put('/api/0.6/changeset/:id/close', function (req, res, osm, m) {
  // todo: lock this record
  var parts = m.params.id.split(':')
  var version = parts.length === 2 ? parts[1] : null
  osm.get(m.params.id, function (err, docs) {
    if (err) return error(500, res, err)
    if (Object.keys(docs).length === 0) {
      return error(404, res, 'not found')
    }
    if (!version && Object.keys(docs).length > 1) {
      return error(409, res, 'Cannot close a changeset with multiple forks.\n'
        + 'Specify a version explicitly after the id using this syntax:\n'
        + '  PUT /api/0.6/changeset/$ID:$VERSION/close')
    }
    var doc = version ? docs[version] : docs[Object.keys(docs)[0]]
    if (!doc) return error(404, res, 'not found')
    if (doc.closedAt) {
      return error(409, res, 'The changeset ' + m.params.id
        + ' was closed at ' + doc.closedAt + '.')
    }
    doc.closedAt = new Date().toISOString()
    osm.put(m.params.id, doc,
      { links: version ? [version] : undefined },
      function (err) {
        if (err) return error(500, res, err)
        else res.end()
      }
    )
  })
})

function error (code, res, err) {
  res.statusCode = code
  res.setHeader('content-type', 'text/plain')
  res.end(err + '\n')
}

function renderElem (doc) {
  var type = doc.type
  delete doc.type

  var children = []
  Object.keys(doc.tags || {}).forEach(function (key) {
    children.push(h('tag/', { k: key, v: doc.tags[key] }))
  })
  delete doc.tags

  if (type === 'way') {
    ;(doc.refs || []).forEach(function (ref) {
      children.push(h('nd/', { ref: ref }))
    })
    delete doc.refs
  }

  if (type === 'relation') {
    ;(doc.members || []).forEach(function (m) {
      children.push(h('member/', m))
    })
    delete doc.members
  }

  return h(type, doc, children)
}
