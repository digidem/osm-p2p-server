var through = require('through2')
var xml2js = require('xml2js')
var builder = new xml2js.Builder({headless: true})

var attrWhitelist = ['id', 'lat', 'lon', 'user', 'uid', 'visible', 'version', 'changeset', 'timestamp']
var typeWhitelist = ['node', 'way', 'relation']

module.exports = through.obj(function write (row, enc, next) {
  var element = {}
  var children = element[row.type] = {}
  var attrs = children.$ = {}

  for (var prop in row) {
    if (!row.hasOwnProperty(prop)) continue
    if (attrWhitelist.indexOf(prop) > -1) {
      attrs[prop] = row[prop]
    }
  }

  if (Array.isArray(row.nodes)) {
    children.nd = row.nodes.map(function (ref) {
      return {$: {ref: ref}}
    })
  } else if (Array.isArray(row.members)) {
    children.member = row.members.map(function (member) {
      return {$: {
        type: member.type,
        ref: member.ref,
        role: member.role
      }}
    })
  } else if (typeof row.tags === 'object') {
    children.tag = Object.keys(row.tags).map(function (key) {
      return {$: {
        k: key,
        v: row.tags[key]
      }}
    })
  }

  // TODO: try...catch error
  var xml = builder.buildObject(element)
  next(null, xml)
})
