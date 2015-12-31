var routes = require('routes')
var inherits = require('inherits')
var h = require('./lib/h.js')
var through = require('through2')

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
  var q = [[bbox[1],bbox[3]],[bbox[0],bbox[2]]]
  var r = this.osmdb.queryStream(q)
  r.once('error', function (err) { res.end(err + '\n') })
  res.write(h('?xml', { version: '1.0', encoding: 'UTF-8' }, [
    h('osm!', [
      h('bounds/', {
        minlat: q[0][0],
        maxlat: q[0][1],
        minlon: q[1][0],
        maxlon: q[1][1]
      })
    ])
  ]))
  r.pipe(through.obj(write, end)).pipe(res)

  function write (row, enc, next) {
    var t = row.type, tags = row.tags || {}
    delete row.type
    delete row.tags
    next(null, h(t, row, Object.keys(tags).map(function (key) {
      return h('tag', { k: key, v: tags[key] })
    })))
  }
  function end (next) {
    this.push('</osm>\n')
    next()
  }
}
