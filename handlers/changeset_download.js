/**
 * Download Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Download:_GET_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fdownload
 */
var xtend = require('xtend')

var h = require('../lib/h.js')

module.exports = function () {
  return function (req, res, osm, m, next) {
    osm.getChanges(m.params.id, function (err, ids) {
      if (err) return next(err)
      var docs = []
      var pending = ids.length
      var errors = []

      if (!ids.length) {
        res.setHeader('content-type', 'text/xml')
        res.end(render([]))
        return
      }
      ids.forEach(function (id) {
        osm.log.get(id, function (err, doc) {
          if (err) errors.push(err)
          else docs.push(doc)
          if (--pending === 0) {
            if (errors.length) return next(new Error(errors.join('\n')))
            res.setHeader('content-type', 'text/xml')
            res.end(render(docs))
          }
        })
      })
    })

    function render (docs) {
      var created = docs.filter(function (doc) {
        return doc.links.length === 0 && doc.value.d === undefined
      })
      var modified = docs.filter(function (doc) {
        return doc.links.length > 0 && doc.value.d === undefined
      })
      var deleted = docs.filter(function (doc) {
        return doc.value.d !== undefined
      })
      return h('osmChange', { version: 0.6, generator: 'osm-p2p' }, [
        created.length && h('create', created.map(docmap)),
        modified.length && h('modify', modified.map(docmap)),
        deleted.length && h('delete', deleted.map(docmap))
      ].filter(Boolean))
    }

    function docmap (doc) {
      var v = doc.value.v
      var type = v.type
      delete v.type
      var tags = v.tags || {}
      var children = Object.keys(tags).map(function (key) {
        return h('tag/', { k: key, v: tags[key] })
      })
      delete v.tags
      if (type === 'way') {
        ;(v.refs || []).forEach(function (ref) {
          children.push(h('nd/', { ref: ref }))
        })
        delete v.refs
      } else if (type === 'relation') {
        ;(v.members || []).forEach(function (member) {
          children.push(h('member/', member))
        })
        delete v.members
      }
      return h(type, xtend(v, {
        id: doc.value.k,
        version: doc.key
      }), children)
    }
  }
}
