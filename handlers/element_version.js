var xtend = require('xtend')
var createError = require('http-errors')

var renderElem = require('../lib/render_elem.js')
var h = require('../lib/h.js')

module.exports = function () {
  return function (req, res, osm, m, next) {
    osm.log.get(m.params.version, function (err, doc) {
      if (err && (/^notfound/.test(err) || err.notFound)) {
        return next(createError.NotFound())
      }
      if (err) return next(err)
      res.setHeader('content-type', 'text/xml')
      res.end(h('osm', [
        renderElem(xtend(doc.value.v, {
          id: m.params.id,
          version: m.params.version
        }))
      ]))
    })
  }
}
