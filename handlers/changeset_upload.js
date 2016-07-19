var createError = require('http-errors')
var concat = require('concat-stream')

var del = require('../lib/del.js')
var xmldiff = require('../lib/xml_diff.js')
var h = require('../lib/h.js')

module.exports = function () {
  return function (req, res, osm, m, next) {
    var results = []
    var parts = m.params.id.split(':')
    var version = parts.length === 2 ? parts[1] : null
    osm.get(m.params.id, function (err, docs) {
      if (err) return next(err)
      if (Object.keys(docs).length === 0) {
        return next(createError(404, 'not found'))
      }
      if (!version && Object.keys(docs).length > 1) {
        return next(createError(409, 'Cannot upload to a changeset with multiple forks.\n' +
          'Specify a version explicitly after the id using this syntax:\n' +
          '  PUT /api/0.6/changeset/$ID:$VERSION/close'))
      }
      var doc = version ? docs[version] : docs[Object.keys(docs)[0]]
      if (!doc) return next(createError(404, 'not found'))
      if (doc.closedAt) {
        return next(createError(409, 'The changeset ' + m.params.id +
          ' was closed at ' + doc.closedAt + '.'))
      }
      req.pipe(concat({ encoding: 'string' }, onbody))
    })

    function onbody (body) {
      var ops = xmldiff(body)
      var batch = []
      var onid = {}

      ops.create.forEach(function (op) {
        var id = op.id
        var oldId = op.oldId

        delete op.id
        delete op.oldId
        delete op.version
        batch.push({
          type: 'put',
          key: id,
          value: op
        })
        onid[id] = function (node) {
          results.push({
            type: op.type,
            attr: {
              old_id: oldId,
              new_id: id,
              new_version: node.key
            }
          })
        }
      })
      ops.modify.forEach(function (op) {
        var id = op.id
        var oldId = op.oldId

        delete op.id
        delete op.oldId
        var links = op.version !== undefined
          ? (op.version || '').split(/\s*,\s*/).filter(Boolean)
          : undefined
        delete op.version
        batch.push({
          type: 'put',
          key: id,
          value: op,
          links: links
        })
        onid[id] = function (node) {
          results.push({
            type: op.type,
            attr: {
              old_id: oldId,
              new_id: id,
              new_version: node.key
            }
          })
        }
      })
      del(osm, ops.delete, function (err, xbatch, xresults) {
        if (err) {
          next(err)
        } else {
          results = results.concat(xresults)
          osm.batch(batch.concat(xbatch), onbatch)
        }
      })

      // function commit () {
      //   osm.batch(batch.filter(function (row) {
      //     return !skip.hasOwnProperty(row.id)
      //   }), onbatch)
      // }

      function onbatch (err, nodes) {
        if (err) return next(err)
        nodes.forEach(function (node) {
          var id = node.value.k
          if (onid.hasOwnProperty(id)) {
            onid[id](node)
          }
        })
        res.setHeader('content-type', 'text/xml')
        res.end(h('diffResult',
          { generator: 'osm-p2p-server', version: '0.6' },
          results.map(function (r) {
            return h(r.type, r.attr)
          })
        ))
      }
    }
  }
}
