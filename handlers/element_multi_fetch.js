var createError = require('http-errors')
var xtend = require('xtend')

var renderElem = require('../lib/render_elem.js')
var h = require('../lib/h.js')

module.exports = function (req, res, api, params, next) {
  if (params.type !== params.ktype) {
    return next(createError(400, 'query parameter must match url type'))
  }
  var ids = params.ids.split(',')
  var results = []
  var pending = 1
  var sent = false
  ids.forEach(function (id, i) {
    pending++
    api.osm.get(id, function (err, docs) {
      if (sent) return
      if (err) {
        sent = true
        return next(err)
      }
      results[i] = []
      Object.keys(docs).forEach(function (key) {
        results[i].push(renderElem(xtend(docs[key], {
          id: id,
          version: key
        })))
      })
      if (--pending === 0) done()
    })
  })
  if (--pending === 0) done()

  function done () {
    var docs = []
    results.forEach(function (group) {
      group.forEach(function (g) {
        docs.push(g)
      })
    })
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    res.end(h('osm', docs))
  }
}
