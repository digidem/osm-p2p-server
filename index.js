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

Server.prototype.handle = function (req, res) {
  var method = req.headers.x_http_method_override || req.method
  var m = this.match(method, req.url)
  if (m) {
    res.setHeader('content-encoding', 'identity')
    res.setHeader('cache-control', 'no-cache')
    m.fn(req, res, this.api, m.params, handleError)
    return m
  }
  return null

  function handleError (err) {
    if (!err) return
    if (!err.status || !err.statusCode) {
      err = errors(err)
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
