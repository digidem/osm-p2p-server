var parsexml = require('xml-parser')
var validxml = require('./xml_valid.js')
var xtend = require('xtend')

module.exports = function (str) {
  if (!validxml(str)) return []
  var xml = parsexml(str)
  var ops = []
  if (xml.root.name !== 'osm') return []
  xml.root.children.forEach(function (c) {
    var doc = xtend(c.attributes, {
      type: c.name
    })
    if (c.name === 'node') {
      doc.lat = Number(doc.lat)
      doc.lon = Number(doc.lon)
    }
    c.children.forEach(function (d) {
      if (d.name === 'tag') {
        if (!doc.tags) doc.tags = {}
        doc.tags[d.attributes.k] = d.attributes.v
      } else if (d.name === 'nd' && d.attributes.ref && c.name === 'way') {
        if (!doc.refs) doc.refs = []
        doc.refs.push(d.attributes.ref)
      } else if (d.name === 'member' && c.name === 'relation') {
        if (!doc.members) doc.members = []
        doc.members.push(d.attributes)
      }
    })
    ops.push(doc)
  })
  return ops
}
