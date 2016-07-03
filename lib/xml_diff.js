var parsexml = require('xml-parser')
var validxml = require('./xml_valid.js')
var xtend = require('xtend')
var randombytes = require('randombytes')
var has = require('has')
var hex2dec = require('./hex2dec.js')

module.exports = function (str) {
  if (!validxml(str)) return []
  var xml = parsexml(str)
  var ops = { create: [], modify: [], delete: [] }
  var ids = { way: {}, node: {}, relation: {} }
  if (xml.root.name !== 'osmChange') return ops
  xml.root.children.forEach(function (c) {
    c.children.forEach(function (ch) {
      var doc = xtend(ch.attributes, { type: ch.name })
      if (doc.id) doc.oldId = doc.id
      if (doc.id && c.name === 'create') {
        if (has(ids, ch.name)) {
          ids[ch.name][doc.id] = hex2dec(randombytes(8).toString('hex'))
          doc.id = ids[ch.name][doc.oldId]
        }
      }
      if (ch.name === 'way') {
        doc.refs = []
        ch.children.forEach(function (nd) {
          if (nd.name === 'nd' && nd.attributes.ref) {
            doc.refs.push(nd.attributes.ref)
          }
        })
      } else if (ch.name === 'relation') {
        doc.members = []
        ch.children.forEach(function (m) {
          if (m.name === 'member' && m.attributes.ref) {
            doc.members.push(xtend(m.attributes))
          }
        })
      }
      ;(ch.children || []).forEach(function (c) {
        if (c.name !== 'tag' || !c.attributes.k || !c.attributes.v) return
        if (!doc.tags) doc.tags = {}
        doc.tags[c.attributes.k] = c.attributes.v
      })
      if (/^(create|modify|delete)$/.test(c.name)) {
        ops[c.name].push(doc)
        if (c.name === 'delete' && c.attributes['if-unused'] !== undefined) {
          doc.ifUnused = true
        }
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
          return has(ids.node, ref) ? ids.node[ref] : ref
        })
      } else if (op.members) {
        op.members.forEach(function (m) {
          if (has(ids.node, m.ref)) m.ref = ids.node[m.ref]
          if (has(ids.way, m.ref)) m.ref = ids.way[m.ref]
          if (has(ids.relation, m.ref)) m.ref = ids.relation[m.ref]
        })
      }
    })
  }
}
