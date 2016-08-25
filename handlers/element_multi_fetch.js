var qs = require('query-string')
var toOsm = require('obj2osm')
var fromArray = require('from2-array')

var errors = require('../lib/errors')

module.exports = function (req, res, api, params, next) {
  if (params.type !== params.ktype) {
    return next(new errors.TypeMismatch(params.type, params.ktype))
  }
  var query = qs.parse(qs.extract(req.url))
  var ids = params.ids.split(',')
  var results = []
  var pending = 1
  var sent = false
  ids.forEach(function (id, i) {
    pending++
    api.getElement(id, function (err, forks) {
      if (sent) return
      if (err) {
        sent = true
        return next(err)
      }
      if (!query.forks) {
        forks = forks.sort(recentFirst).slice(0, 1)
      }
      results[i] = forks
      if (--pending === 0) done()
    })
  })
  if (--pending === 0) done()

  function done () {
    var flattened = []
    results.forEach(function (group) {
      group.forEach(function (g) {
        flattened.push(g)
      })
    })
    var r = fromArray.obj(flattened).on('error', next)
    var t = toOsm().on('error', next)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    r.pipe(t).pipe(res)
  }
}

function recentFirst (a, b) {
  if (a.timestamp && b.timestamp) {
    return b.timestamp - a.timestamp
  }
  // Ensure sorting is stable between requests
  return a.version < b.version ? -1 : 1
}
