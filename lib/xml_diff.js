var parsexml = require('xml-parser')

module.exports = function (str) {
  var xml = parsexml(str)
  var ops = []
  if (xml.root.name !== 'osmChange') return []
  xml.root.children.forEach(function (c) {
    console.log('c=', c)
  })
  return ops
}
