var pumpify = require('pumpify')
var collect = require('collect-stream')
var createError = require('http-errors')
var xmlNodes = require('xml-nodes')
var xtend = require('xtend')

var isValidContentType = require('../lib/valid_content_type.js')
var xml2Obj = require('../transforms/xml_to_obj.js')

module.exports = function (createElement) {
  return function (req, res, osm, m, next) {
    if (!isValidContentType(req)) {
      return next(createError(400, 'unsupported content-type'))
    }

    var r = pumpify.obj(req, xmlNodes(m.params.type), xml2Obj())
    collect(r, function (err, ops) {
      if (err) return next(createError(400, err, 'error parsing XML'))
      if (!ops.length) return next(createError(400, 'no ' + m.params.type + ' elements found in XML'))

      // If multiple elements are provided only the first is created.
      // The rest is discarded (this behaviour differs from changeset creation).
      createElement(ops[0], osm, function (err, id, node) {
        if (err) return next(err)
        res.setHeader('content-type', 'text/plain')
        res.end(id + '\n')
      })
    })
  }
}
