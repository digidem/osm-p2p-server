var contentType = require('content-type')
var randombytes = require('randombytes')
var JSONStream = require('JSONStream')

var version = require('../package.json').version

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

var TEMPLATE = {
  version: 0.6,
  generator: 'osm-p2p v' + version,
  elements: []
}

var SEP = ',\n        '

function OsmJSONStream (opts) {
  var template = Object.assign({}, TEMPLATE, opts)
  var openClose = JSON.stringify(template, null, 4).split('"elements": [')
  var open = openClose[0] + '"elements": [\n        '
  var close = '\n    ' + openClose[1]
  return JSONStream.stringify(open, SEP, close)
}

/**
 * Sort function to sort forks by most recent first, or by version id
 * if no timestamps are set
 */
function cmpFork (a, b) {
  if (a.timestamp && b.timestamp) {
    if (a.timestamp > b.timestamp) return -1
    if (a.timestamp < b.timestamp) return 1
    return 0
  }
  if (a.timestamp) return -1
  if (b.timestamp) return 1
  // Ensure sorting is stable between requests
  return a.version < b.version ? -1 : 1
}

/**
 * Generate a unique 64-bit id string which can be parsed as a 64-bit integer
 */
function generateId () {
  return hex2dec(randombytes(8).toString('hex'))
}

function hex2dec (hex) {
  var d = ''
  for (var i=hex.length-5; i > -5; i-=5) { // LCM of 16 and 10 is 16*5
    d = parseInt(hex.slice(Math.max(0,i),i+5),16) + d
  }
  return d
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
  isValidContentType: isValidContentType,
  cmpFork: cmpFork,
  OsmJSONStream: OsmJSONStream
}
