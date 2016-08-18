var concat = require('concat-stream')

var errors = require('../lib/errors')
var del = require('../lib/del.js')
var xmlcreate = require('../lib/xml_create.js')

module.exports = function (req, res, api, params, next) {
  req.pipe(concat({ encoding: 'string' }, onbody))
  function onbody (body) {
    var ops = xmlcreate(body)
    if (ops.length !== 1) {
      return next(new errors.DeleteMultiple())
    }
    if (ops[0].type !== params.type) {
      return next(new errors.TypeMismatch(ops[0].type, params.type))
    }
    if (ops[0].id !== params.id) {
      return next(new errors.IdMismatch(ops[0].id, params.id))
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
