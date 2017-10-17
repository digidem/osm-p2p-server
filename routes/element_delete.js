var collect = require('collect-stream')
var osm2Obj = require('osm2obj')

var isValidContentType = require('../lib/util').isValidContentType
var errors = require('../errors')

module.exports = function (req, res, api, params, next) {
  if (!isValidContentType(req)) {
    return next(new errors.UnsupportedContentType())
  }

  var r = req.pipe(osm2Obj({coerceIds: false}))
  collect(r, function (err, ops) {
    if (err || !ops.length) return next(new errors.XmlParseError(err))
    if (ops.length !== 1) {
      return next(new errors.DeleteMultiple())
    }
    if (ops[0].type !== params.type) {
      return next(new errors.TypeMismatch(ops[0].type, params.type))
    }
    if (ops[0].id !== params.id) {
      return next(new errors.IdMismatch(ops[0].id, params.id))
    }
    if (!ops[0].changeset) {
      return next(new errors.MissingChangesetId())
    }
    ops[0].action = 'delete'
    api.putChanges(ops, ops[0].changeset, function (err, diffResult) {
      if (err) return next(err)
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end(diffResult.map(function (el) { return el.old_id }).join('\n'))
    })
  })
}
