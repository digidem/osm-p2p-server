var xml2js = require('xml2js')
var builder = new xml2js.Builder({headless: true})
var through = require('through2')
var version = require('../package.json').version

function startXml (root) {
  root = root || 'osm'
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<' + root + ' version="0.6" generator="osm-p2p v' + version + '">\n'
}
function endXml (root) {
  root = root || 'osm'
  return '\n</' + root + '>\n'
}

function buildBoundsXml (bbox) {
  if (!bbox || bbox.length !== 4) return ''
  return builder.buildObject({
    bounds: {
      $: {
        minlon: bbox[0],
        minlat: bbox[1],
        maxlon: bbox[2],
        maxlat: bbox[3]
      }
    }
  }) + '\n'
}

module.exports = function (opts) {
  opts = opts || {}

  var stream = through(write, end)
  stream.push(startXml(opts.root))
  stream.push(buildBoundsXml(opts.bbox))
  return stream

  // noop
  function write (chunk, enc, cb) {
    cb(null, chunk)
  }

  function end (cb) {
    this.push(endXml(opts.root))
    cb()
  }
}

module.exports.fn = function (response, opts) {
  opts = opts || {}
  return startXml(opts.root) +
    buildBoundsXml(opts.bbox) +
    response +
    endXml(opts.root)
}
