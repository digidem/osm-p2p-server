var parsexml = require('xml-parser')
var xtend = require('xtend')
var randombytes = require('randombytes')

module.exports = function (str) {
  var xml = parsexml(str)
  var ops = { create: [], modify: [], delete: [] }
  var ids = {}
  if (xml.root.name !== 'osmChange') return ops
  xml.root.children.forEach(function (c) {
    c.children.forEach(function (ch) {
      var doc = xtend(ch.attributes, { type: ch.name })
      if (doc.id && Number(doc.id) < 0) {
        ids[doc.id] = randombytes(8).toString('hex')
        doc.id = ids[doc.id]
      }
      if (ch.name === 'way') {
        doc.refs = []
        ch.children.forEach(function (nd) {
          if (nd.name === 'nd' && nd.attributes.ref) {
            doc.refs.push(nd.attributes.ref)
          }
        })
      } else if (ch.name === 'member') {
        doc.members = []
        ch.children.forEach(function (m) {
          if (m.name === 'member' && m.attributes.ref) {
            doc.members.push(xtend(m.attributes, { type: 'member' }))
          }
        })
      }
      if (/^(create|modify|delete)$/.test(c.name)) {
        ops[c.name].push(doc)
      }
    })
  })
  return ops
}
