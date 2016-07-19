var xtend = require('xtend')
var createError = require('http-errors')

var renderElem = require('../lib/render_elem.js')
var h = require('../lib/h.js')

module.exports = function () {
  return function (req, res, osm, m, next) {
    osm.get(m.params.id, function (err, docs) {
      if (err) return next(err)
      if (Object.keys(docs).length === 0) return next(createError.NotFound())
      res.setHeader('content-type', 'text/xml')
      res.end(h('osm', Object.keys(docs).map(function (key) {
        return renderElem(xtend(docs[key], {
          id: m.params.id,
          version: key
        }))
      })))
    })
  }
}
