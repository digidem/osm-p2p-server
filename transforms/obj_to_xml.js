var through = require('through2')
var xml2js = require('xml2js')
var builder = new xml2js.Builder({
  headless: true,
  attrkey: '$attrs'
})

var attrWhitelist = ['id', 'lat', 'lon', 'user', 'uid', 'visible', 'version', 'changeset', 'timestamp']

/**
 * Converts [OSM JSON](http://overpass-api.de/output_formats.html#json) objects to
 * [OSM XML](http://wiki.openstreetmap.org/wiki/OSM_XML)
 * @return {stream.Transform}
 */
module.exports = function () {
  return through.obj(function write (row, enc, next) {
    var element = {}
    var children = element[row.type] = {}
    var attrs = children.$attrs = {}

    for (var prop in row) {
      if (!row.hasOwnProperty(prop)) continue
      if (attrWhitelist.indexOf(prop) > -1) {
        attrs[prop] = row[prop]
      }
    }

    if (Array.isArray(row.nodes)) {
      children.nd = row.nodes.map(function (ref) {
        return {$attrs: {ref: ref}}
      })
    } else if (Array.isArray(row.members)) {
      children.member = row.members.map(function (member) {
        return {$attrs: member}
      })
    } else if (typeof row.tags === 'object') {
      children.tag = Object.keys(row.tags).map(function (key) {
        return {$attrs: {
          k: key,
          v: row.tags[key]
        }}
      })
    }

    try {
      var xml = builder.buildObject(element)
    } catch (e) {
      console.log('oops')
      return next(e)
    }
    next(null, xml)
  })
}
