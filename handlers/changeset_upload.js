var collect = require('collect-stream')
var osm2Obj = require('osm2json')
var toOsm = require('obj2osm')
var fromArray = require('from2-array')

var errors = require('../lib/errors')
var isValidContentType = require('../lib/valid_content_type.js')

module.exports = function (req, res, api, params, next) {
  if (!isValidContentType(req)) {
    return next(new errors.UnsupportedContentType())
  }
  var parts = params.id.split(':')
  var version = parts.length === 2 ? parts[1] : null

  var r = req.pipe(osm2Obj({coerceIds: false}))
  collect(r, function (err, changes) {
    if (err || !changes.length) return next(new errors.XmlParseError(err))
    api.putChanges(changes, params.id, version, function (err, diffResult) {
      if (err) return next(err)
      res.setHeader('content-type', 'text/xml; charset=utf-8')
      fromArray.obj(diffResult)
        .pipe(toOsm({root: 'diffResult'}))
        .pipe(res)
        .on('error', next)
    })
  })
}
