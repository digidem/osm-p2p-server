var map = require('through2-map')

/**
 * Converts objects from OSM JSON to objects compatible with osm-p2p
 * @param {object} obj object from parsing OSM JSON
 * @return {object} object compatible with osm-p2p
 */
function obj2P2p (obj) {
  var doc = {}
  for (var prop in obj) {
    if (!obj.hasOwnProperty(prop)) continue
    if (prop === 'nodes') {
      doc.refs = obj.nodes
    } else {
      doc[prop] = obj[prop]
    }
  }
  return doc
}

module.exports = function () {
  return map.obj(obj2P2p)
}

module.exports.fn = obj2P2p
