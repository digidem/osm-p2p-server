var qs = require('query-string')
var toOsm = require('obj2osm')
var fromArray = require('from2-array')

var errors = require('../errors')
var cmpFork = require('../lib/util').cmpFork

module.exports = function (req, res, api, params, next) {
  var query = qs.parse(qs.extract(req.url))
  if (!query[params.type]) {
    return next(new errors.MissingParameter(params.type))
  }
  var ids = query[params.type].split(',')
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
        forks = forks.sort(cmpFork).slice(0, 1)
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

