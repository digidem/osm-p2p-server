var error = require('debug')('osm-p2p-server:error')

var errors = require('./errors')
var router = require('./routes')
var createApi = require('./api')

module.exports = Server

function Server (osmdb) {
  if (!(this instanceof Server)) return new Server(osmdb)
  var self = this
  self.api = createApi(osmdb)
  self.router = router
}

Server.prototype.match = function (method, url) {
  return this.router.match(method.toUpperCase() + ' ' + url)
}

Server.prototype.handle = function (req, res, next) {
  var method = req.headers.x_http_method_override || req.method
  var m = this.match(method, req.url.split('?')[0])
  if (m) {
    res.setHeader('content-encoding', 'identity')
    res.setHeader('cache-control', 'no-cache')
    m.fn(req, res, this.api, m.params, handleError)
    return m
  }
  if (typeof next === 'function') next()
  return null

  function handleError (err) {
    // If used as middleware, fallthrough
    if (typeof next === 'function') return next(err)
    if (!err) return
    if (!err.status || !err.statusCode) {
      err = errors(err)
    }
    if (err.expose && !res.headersSent) {
      res.statusCode = err.status
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(err.message)
    } else {
      res.end()
    }
    error(err)
  }
}
