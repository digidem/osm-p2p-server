var through = require('through2')
var parsexml = require('xml-parser')
xml2js = require('xml2js')
var parser = new xml2js.Parser({
  attrkey: '$attrs'
})

var attrWhitelist = ['id', 'lat', 'lon', 'user', 'uid', 'visible', 'version', 'changeset', 'timestamp']
var supportedTypes = ['node', 'way', 'relation', 'changeset']

/**
 * Converts OSM XML Elements to objects compatible with
 * [OSM JSON](http://overpass-api.de/output_formats.html#json)
 * @return {streat.Transform}
 */
module.exports = function () {
  return through.obj(function write (chunk, enc, next) {
    parser.parseString(chunk.toString(), function (err, xml) {
      if (err) return next(err)
      var element = {}
      var attrs = xml.$attrs
      element.type = Object.keys(xml)[0]

      if (supportedTypes.indexOf(element.type) === -1) {
        return next(new Error('Invalid XML: unsupported type %s', element.type))
      }

      for (var prop in attrs) {
        if (!attrs.hasOwnProperty(prop)) continue
        if (attrWhitelist.indexOf(prop) > -1) {
          element[prop] = attrs[prop]
        }
      }

      if (Array.isArray(xml.nd)) {
        element.nodes = xml.nd.map(function (c) {
          return c.$attrs.ref
        })
      } else if (Array.isArray(xml.member)) {
        element.members = xml.member.map(function (c) {
          return c.$attrs
        })
      } else if (Array.isArray(xml.tag)) {
        element.tag = xml.tag.reduce(function (p, v) {
          p[v.k] = v.v
          return p
        }, {})
      }

      next(null, element)
    })
  })
}
