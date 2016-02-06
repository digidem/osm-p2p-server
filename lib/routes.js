var h = require('./h.js')
var body = require('body/any')
var randombytes = require('randombytes')
var toxml = require('osm-p2p-xml')
var parsexml = require('xml-parser')
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

put('/api/0.6/changeset/create', function (req, res, osm) {
  var self = this
  var pending = 1, errors = [], keys = []
  req.pipe(concat({ encoding: 'string' }, function (body) {
    if (/\/json$/.test(req.headers['content-type'])) {
      try { var params = JSON.parse(body) }
      catch (err) {
        res.statusCode = 400
        res.end(err + '\n')
        return
      }
      processJSON(params)
    } else if (/\/xml$/.test(req.headers['content-type'])) {
      processXML(parsexml(body))
    }
  }))

  function processJSON (changes) {
    var docs = {}
    changes.created.forEach(function (ch) {
      docs[ch.id] = randombytes(8).toString('hex')
      ch.id = docs[ch.id]
    })
    changes.created.forEach(function (ch) {
      var id = fix(docs, ch)
      pending++
      self.osmdb.put(id, ch, function (err) {
        if (err) errors.push(err)
        else keys.push(id)
        if (--pending === 0) done()
      })
    })
    changes.modified.forEach(function (ch) {
      var id = fix(docs, ch)
      pending++
      var opts = { links: ch.version ? [ch.version] : [] }
      self.osmdb.put(id, ch, opts, function (err) {
        if (err) errors.push(err)
        else keys.push(id)
        if (--pending === 0) done()
      })
    })
    changes.deleted.forEach(function (ch) {
      var id = ch.id.replace(/^[nw]/, '')
      pending++
      var opts = { links: ch.version ? [ch.version] : [] }
      self.osmdb.del(id, opts, function (err) {
        if (err) errors.push(err)
        else keys.push(id)
        if (--pending === 0) done()
      })
    })
    if (--pending === 0) done()
  }

  function processXML (xml) {
    if (xml.root.name !== 'osm') {
      res.statusCode = 400
      res.end('root element must be <osm>\n')
      return
    }
    xml.root.children.forEach(function (c) {
      console.log(c)
    })
  }

  function done () {
    if (errors.length) {
      return error(500, res, errors.map(String).join('\n'))
    } else {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(keys) + '\n')
    }
  }
})

function fix (docs, ch) {
  if (ch.loc) {
    ch.lat = ch.loc[1]
    ch.lon = ch.loc[0]
    ch.type = 'node'
    delete ch.loc
  } else if (ch.nodes) {
    ch.type = 'way'
    ch.refs = ch.nodes
      .map(function (id) { return docs.hasOwnProperty(id) ? docs[id] : id })
      .map(function (id) { return id.replace(/^[nw]/,'') })
    delete ch.nodes
  }
  ch.timestamp = new Date().toISOString()
  var id = ch.id
  if (docs.hasOwnProperty(id)) id = docs[id]
  delete ch.id
  return id.replace(/^[nw]/, '')
}

function error (code, res, err) {
  res.statusCode = code
  res.end(err + '\n')
}
