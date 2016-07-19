/**
 * Create Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Create:_PUT_.2Fapi.2F0.6.2Fchangeset.2Fcreate
 */

var createError = require('http-errors')
var randombytes = require('randombytes')
var concat = require('concat-stream')
var xtend = require('xtend')

var xmlcreate = require('../lib/xml_create.js')
var hex2dec = require('../lib/hex2dec.js')

module.exports = function () {
  return function (req, res, osm, m, next) {
    if (!/\/xml$/.test(req.headers['content-type'])) {
      return next(createError(400, 'unsupported content-type'))
    }
    req.pipe(concat({ encoding: 'string' }, function (body) {
      if (/\/xml$/.test(req.headers['content-type'])) {
        processOps(xmlcreate(body))
      } else {
        next(createError(400, 'unsupported content-type'))
      }
    }))

    function processOps (ops) {
      if (ops.length === 0) {
        return next(createError(400, 'malformed request'))
      }
      if (m.params.type !== 'changeset') {
        ops.splice(1) // discard all but the first element
      }
      // changesets can have multiple ops

      for (var i = 0; i < ops.length; i++) {
        if (/^(node|way|relation)$/.test(ops[i].type) && !ops[i].changeset) {
          return next(createError(400, 'missing changeset'))
        }
      }

      if (m.params.type === 'changeset') {
        var id = hex2dec(randombytes(8).toString('hex'))
        var value = { type: 'changeset', tags: {} }
        ops.forEach(function (op) {
          value.tags = xtend(value.tags, op.tags || {})
        })
        osm.batch([
          { type: 'put', key: id, value: value }
        ], onbatch)
      } else {
        osm.batch(ops.map(function (op) {
          var id = hex2dec(randombytes(8).toString('hex'))
          return { type: 'put', key: id, value: op }
        }), onbatch)
      }

      function onbatch (err, nodes) {
        if (err) return next(err)
        var ids = nodes.map(function (node) {
          return node.value.k
        })
        res.setHeader('content-type', 'text/plain')
        res.end(ids.join('\n'))
      }
    }
  }
}
