var contentType = require('content-type')
var randombytes = require('randombytes')
var convert = require('base-convertor')

/**
 * Converts objects from osm-p2p to objects compatible with the OSM JSON format
 * @param {object} doc object from osm-p2p
 * @return {object} object compatible with the OSM JSON format
 */
function refs2nodes (doc) {
  var element = {}
  for (var prop in doc) {
    if (!doc.hasOwnProperty(prop)) continue
    if (prop === 'refs') {
      element.nodes = doc.refs
    } else {
      element[prop] = doc[prop]
    }
  }
  return element
}

/**
 * Converts objects from OSM JSON to objects compatible with osm-p2p
 * @param {object} obj object from parsing OSM JSON
 * @return {object} object compatible with osm-p2p
 */
function nodes2refs (obj) {
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

/**
 * Generate a unique 64-bit id string which can be parsed as a 64-bit integer
 */
function generateId () {
  return hex2dec(randombytes(8).toString('hex'))
}

function hex2dec (hex) {
  return convert(hex.toUpperCase(), '0123456789ABCDEF', '0123456789')
}

function isValidContentType (req) {
  try {
    if (/\/xml$/.test(contentType.parse(req).type)) {
      return true
    }
  } catch (e) {}
}

module.exports = {
  refs2nodes: refs2nodes,
  nodes2refs: nodes2refs,
  generateId: generateId,
  isValidContentType: isValidContentType
}
