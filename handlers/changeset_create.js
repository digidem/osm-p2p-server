/**
 * Create Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Create:_PUT_.2Fapi.2F0.6.2Fchangeset.2Fcreate
 */

var collect = require('collect-stream')
var xtend = require('xtend')
var osm2Obj = require('osm2json')

var errors = require('../lib/errors')
var isValidContentType = require('../lib/valid_content_type.js')

module.exports = function (req, res, api, params, next) {
  if (!isValidContentType(req)) {
    return next(new errors.UnsupportedContentType())
  }

  var r = req.pipe(osm2Obj({types: ['changeset'], strict: true, coerceIds: false}))
  collect(r, function (err, ops) {
    if (err) return next(new errors.XmlParseError(err))
    if (!ops.length) return next(new errors.XmlMissingElement('changeset'))

    // If more than one changeset element is included in the PUT request
    // tags are merged with later tags overwriting previous tags
    var mergedChangeset = ops.reduce(function (p, v) {
      p.tags = xtend(p.tags, v.tags)
      return p
    })
    api.createChangeset(mergedChangeset, function (err, id, node) {
      if (err) return next(err)
      res.setHeader('content-type', 'text/plain')
      res.end(id + '\n')
    })
  })
}
