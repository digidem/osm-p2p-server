var parsexml = require('xml-parser')
var xtend = require('xtend')
var randombytes = require('randombytes')
var has = require('has')
var hex2dec = require('./hex2dec.js')

module.exports = function (str) {
  var xml = parsexml(str)
  var ops = { create: [], modify: [], delete: [] }
  var ids = {}
  if (xml.root.name !== 'osmChange') return ops
  xml.root.children.forEach(function (c) {
    c.children.forEach(function (ch) {
      var doc = xtend(ch.attributes, { type: ch.name })
      if (doc.id) doc.oldId = doc.id
      if (doc.id && Number(doc.id) < 0) {
        ids[doc.id] = hex2dec(randombytes(8).toString('hex'))
        doc.id = ids[doc.oldId]
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
  updateRefs(ops.create)
  updateRefs(ops.modify)
  updateRefs(ops.delete)
  return ops

  function updateRefs (ops) {
    ops.forEach(function (op) {
      if (op.refs) {
        op.refs = op.refs.map(function (ref) {
          return has(ids, ref) ? ids[ref] : ref
        })
      } else if (op.members) {
        op.members.forEach(function (m) {
          if (has(ids, m.ref)) m.ref = ids[m.ref]
        })
      }
    })
  }
}
