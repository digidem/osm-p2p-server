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
  var method = (req.headers.X_HTTP_METHOD_OVERRIDE || req.method)
  var m = this.match(method, req.url)
  if (m) {
    m.fn(req, res, this.osmdb, m)
    return m
  }
  return null
}
