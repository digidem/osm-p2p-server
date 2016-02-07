var Router = require('routes')
var routes = require('./lib/routes.js')

module.exports = Server

function Server (osmdb) {
  if (!(this instanceof Server)) return new Server(osmdb)
  var self = this
  self.osmdb = osmdb
  self.routers = {
    get: Router(),
    post: Router(),
    put: Router(),
    delete: Router()
  }
  routes.forEach(function (r) {
    self.routers[r[0]].addRoute(r[1], r[2])
  })
}

Server.prototype.match = function (method, url) {
  method = method.toLowerCase()
  if (!this.routers.hasOwnProperty(method)) return null
  return this.routers[method].match(url)
}

Server.prototype.handle = function (req, res) {
  var method = (req.headers.X_HTTP_METHOD_OVERRIDE || req.method)
    .toLowerCase()
  var m = this.match(method, req.url)
  if (m) {
    m.fn(req, res, this.osmdb, m)
    return m
  }
  return null
}
