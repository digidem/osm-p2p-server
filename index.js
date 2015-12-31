var routes = require('routes')
var inherits = require('inherits')
var h = require('hyperscript')

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
  this.routers.get.addRoute('/api/0.6/map', this._mapRoute.bind(this))
}

Router.prototype.match = function (method, url) {
  method = method.toLowerCase()
  if (!this.routers.hasOwnProperty(method)) return null
  return this.routers[method].match(url)
}

Router.prototype._capRoute = function (req, res) {
  var pre = '<?xml version="1.0" encoding="UTF-8"?>'
  res.end(pre + h('osm', { version: 0.6, generator: 'osm-p2p' }, [
    h('api', [
      h('version', { minimum: 0.6, maximum: 0.6 }),
      h('area', { maximum: 0.25 }), // in square degrees
      h('waynodes', { maximum: 2000 }),
      h('tracepoints', { per_page: 5000 }),
      h('timeout', { seconds: 300 }),
      h('status', { database: 'online', api: 'online', gpx: 'online' }),
    ])
  ]).outerHTML)
}

Router.prototype._mapRoute = function (req, res) {
}
