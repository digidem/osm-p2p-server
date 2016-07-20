var xml2js = require('xml2js')
var builder = new xml2js.Builder({headless: true})
var through = require('through2')
var version = require('../package.json').version

var startXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<osm version="0.6" generator="osm-p2p v' + version + '">\n'
var endXml = '</osm>\n'

module.exports = function (opts, response) {
  opts = opts || {}
  var bbox = opts.bbox
  var boundsXml = ''

  if (bbox && bbox.length === 4) {
    boundsXml = builder.buildObject({
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
  if (response) {
    return startXml + boundsXml + response + endXml
  }
  var stream = through(write, end)
  stream.push(startXml)
  stream.push(boundsXml)
  return stream

  // noop
  function write (chunk, enc, cb) {
    cb(null, chunk)
  }

  function end (cb) {
    this.push(endXml)
    cb()
  }
}
