var Router = require('routes')
var qs = require('query-string')
var routes = require('./routes')

module.exports = Server

function Server (osmdb) {
  if (!(this instanceof Server)) return new Server(osmdb)
  this.osmdb = osmdb
  this.routers = {
    get: Router(),
    post: Router(),
    put: Router(),
    delete: Router()
  }
  routes.forEach(function (route) {
    this.routers[route.method].addRoute(route.path, route.GetRoute(osmdb))
  }, this)
}

Server.prototype.match = function (method, url) {
  method = method.toLowerCase()
  if (!this.routers.hasOwnProperty(method)) return null
  return this.routers[method].match(url)
}

Server.prototype.handle = function (req, res) {
  var method = (req.headers.X_HTTP_METHOD_OVERRIDE || req.method)
    .toLowerCase()
  var match = this.match(method, req.url)
  if (!match) return null

  req.query = qs.parse(qs.extract(req.url))
  req.params = match.params

  match.fn(req, res, function (err) {
    if (!err) return
    res.statusCode = err.statusCode
    res.end(err.message + '\n')
    return match
  })
}
