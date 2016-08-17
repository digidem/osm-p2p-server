var createError = require('http-errors')
var concat = require('concat-stream')

var del = require('../lib/del.js')
var xmlcreate = require('../lib/xml_create.js')

module.exports = function (req, res, api, params, next) {
  req.pipe(concat({ encoding: 'string' }, onbody))
  function onbody (body) {
    var ops = xmlcreate(body)
    if (ops.length !== 1) {
      return next(createError(400, 'Only one element can be deleted per request.'))
    }
    if (ops[0].type !== params.type) {
      return next(createError(400, 'Type mismatch between url parameter and xml.'))
    }
    if (ops[0].id !== params.id) {
      return next(createError(400, 'id mismatch between url parameter and xml.'))
    }
    del(api.osm, ops, {}, function (err, batch) {
      if (err) {
        next(err)
      } else {
        api.osm.batch(batch, onbatch)
      }
    })
  }
  function onbatch (err, nodes) {
    if (err) return next(err)
    res.setHeader('content-type', 'text/plain')
    res.end(nodes.map(function (node) { return node.key }).join('\n'))
  }
}
