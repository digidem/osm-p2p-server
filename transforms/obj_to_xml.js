var map = require('through2-map')
var xml2js = require('xml2js')
var builder = new xml2js.Builder({
  headless: true,
  attrkey: '$attrs'
})

var attrWhitelist = ['id', 'lat', 'lon', 'user', 'uid', 'visible', 'version', 'changeset', 'timestamp', 'created_at', 'closed_at', 'open', 'min_lat', 'min_lon', 'max_lat', 'max_lon', 'comments_count']

/**
 * Converts objects to OSM XML
 * @param {object} obj Object compatible with OSM JSON format
 * @return {string} OSM XML Element
 */
function obj2Xml (obj) {
  var element = {}
  var children = element[obj.type] = {}
  var attrs = children.$attrs = {}

  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue
    if (attrWhitelist.indexOf(prop) > -1) {
      attrs[prop] = obj[prop]
    }
  }

  if (Array.isArray(obj.nodes)) {
    children.nd = obj.nodes.map(function (ref) {
      return {$attrs: {ref: ref}}
    })
  } else if (Array.isArray(obj.members)) {
    children.member = obj.members.map(function (member) {
      return {$attrs: member}
    })
  }
  if (typeof obj.tags === 'object') {
    children.tag = Object.keys(obj.tags).map(function (key) {
      return {$attrs: {
        k: key,
        v: obj.tags[key]
      }}
    })
  }

  return builder.buildObject(element)
}

module.exports = function () {
  return map.obj(obj2Xml)
}

module.exports.fn = obj2Xml
