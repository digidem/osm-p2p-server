var routes = require('routes')
var inherits = require('inherits')
var h = require('./lib/h.js')
var through = require('through2')
var body = require('body/any')
var randombytes = require('randombytes')

module.exports = Router

function Router (osmdb) {
  if (!(this instanceof Router)) return new Router(osmdb)
  this.osmdb = osmdb
  this.routers = {
    get: routes(),
    post: routes()
  }
  this.routers.get.addRoute('/api/capabilities', this._capRoute.bind(this))
  this.routers.get.addRoute('/api/0.6/capabilities', this._capRoute.bind(this))
  this.routers.get.addRoute('/api/0.6/map?*', this._mapRoute.bind(this))
  this.routers.post.addRoute('/api/changeset', this._chRoute.bind(this))
}

Router.prototype.match = function (method, url) {
  method = method.toLowerCase()
  if (!this.routers.hasOwnProperty(method)) return null
  return this.routers[method].match(url)
}

Router.prototype.handle = function (req, res) {
  var m = this.match(req.method, req.url)
  if (m) {
    m.fn(m, req, res)
    return m
  }
  return null
}

Router.prototype._capRoute = function (m, req, res) {
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
}

Router.prototype._mapRoute = function (m, req, res) {
  var bbox = req.url.replace(/[^?]*\?bbox=/,'').split(',').map(Number)
  var q = [[bbox[1],bbox[3]],[bbox[0],bbox[2]]] // left,bottom,right,top
  var r = this.osmdb.queryStream(q)
  r.once('error', function (err) { res.end(err + '\n') })
  res.write(h('?xml', { version: '1.0', encoding: 'UTF-8' }, [
    h('osm!', [
      h('bounds/', {
        minlat: q[0][0], maxlat: q[0][1],
        minlon: q[1][0], maxlon: q[1][1]
      })
    ])
  ]))
  r.pipe(through.obj(write, end)).pipe(res)

  function write (row, enc, next) {
    var children = []
    ;(row.refs || []).forEach(function (ref) {
      children.push(h('nd/', { ref: ref }))
    })
    delete row.refs

    Object.keys(row.members || []).forEach(function (ref) {
      children.push(h('member/', {
        type: 'relation',
        ref: ref,
        role: ''
      }))
    })
    delete row.members

    Object.keys(row.tags || {}).forEach(function (key) {
      children.push(h('tag', { k: key, v: row.tags[key] }))
    })
    delete row.tags

    var tag = row.type
    delete row.type
    next(null, h(tag, row, children))
  }
  function end (next) {
    this.push('</osm>\n')
    next()
  }
}

Router.prototype._chRoute = function (m, req, res) {
  var self = this
  var pending = 1, errors = [], keys = []
  body(req, res, function (err, params) {
    if (err) return error(400, res, err)
    var docs = {}
    params.changes.created.map(function (ch) {
      docs[ch.id] = randombytes(8).toString('hex')
      ch.id = docs[ch.id]
    })
    params.changes.created.forEach(function (ch) {
      if (ch.loc) {
        ch.lat = ch.loc[1]
        ch.lon = ch.loc[0]
        ch.type = 'node'
        delete ch.loc
      } else if (ch.nodes) {
        ch.type = 'way'
        ch.refs = ch.nodes.map(function (id) { return docs[id] })
        delete ch.nodes
      }
      var id = ch.id
      ch.timestamp = new Date().toISOString()
      console.log('CREATE', ch)
      delete ch.id
      pending++
      self.osmdb.put(id, ch, function (err) {
        if (err) errors.push(err)
        else keys.push(id)
        if (--pending === 0) done()
      })
    })
    if (--pending === 0) done()
  })
  function done () {
    if (errors.length) {
      return error(500, res, errors.map(String).join('\n'))
    } else {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(keys) + '\n')
    }
  }
}

function error (code, res, err) {
  res.statusCode = code
  res.end(err + '\n')
}
