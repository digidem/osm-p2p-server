var createError = require('http-errors')
var error = require('debug')('osm-p2p-server:error')

var router = require('./lib/routes.js')

module.exports = Server

function Server (osmdb) {
  if (!(this instanceof Server)) return new Server(osmdb)
  var self = this
  self.osmdb = osmdb
  self.router = router
}

Server.prototype.match = function (method, url) {
  return this.router.match(method.toUpperCase() + ' ' + url)
}

Server.prototype.handle = function (req, res) {
  var method = req.headers.x_http_method_override || req.method
  var m = this.match(method, req.url)
  if (m) {
    m.fn(req, res, this.osmdb, m, handleError)
    return m
  }
  return null

  function handleError (err) {
    if (!err) return
    if (!err.status || !err.statusCode) {
      err = createError(err)
    }
    if (err.expose && !res.headersSent) {
      res.statusCode = err.status
      res.setHeader('content-type', 'text/plain')
      res.end(err.message + '\n')
    } else {
      res.end()
    }
    error(err)
  }
}
