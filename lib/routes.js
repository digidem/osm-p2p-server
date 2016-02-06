var h = require('./h.js')
var body = require('body/any')
var randombytes = require('randombytes')
var toxml = require('osm-p2p-xml')
var readxml = require('./readxml.js')
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

put('/api/0.6/:type/create', function (req, res, osm) {
  var errors = [], ids = []
  req.pipe(concat({ encoding: 'string' }, function (body) {
    if (/\/xml$/.test(req.headers['content-type'])) {
      processOps(readxml(body))
    } else {
      error(400, res, 'unsupported content-type')
    }
  }))

  function processOps (ops) {
    if (ops.length === 0) {
      return error(400, res, 'malformed request')
    }
    if (/^\/api\/0.6\/(node|way|relation)\/create/.test(req.url)) {
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

function error (code, res, err) {
  res.statusCode = code
  res.end(err + '\n')
}
