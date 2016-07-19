var h = require('./h.js')

module.exports = function renderElem (doc) {
  var type = doc.type
  delete doc.type

  var children = []
  Object.keys(doc.tags || {}).forEach(function (key) {
    children.push(h('tag/', { k: key, v: doc.tags[key] }))
  })
  delete doc.tags

  if (type === 'way') {
    ;(doc.refs || []).forEach(function (ref) {
      children.push(h('nd/', { ref: ref }))
    })
    delete doc.refs
  }

  if (type === 'relation') {
    ;(doc.members || []).forEach(function (m) {
      children.push(h('member/', m))
    })
    delete doc.members
  }

  return h(type, doc, children)
}
