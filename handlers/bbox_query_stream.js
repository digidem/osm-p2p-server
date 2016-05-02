var pumpify = require('pumpify')
var toxml = require('osm-p2p-xml')

var bboxQueryStream = function (bboxString, osmdb, opts) {
  var bbox = bboxString.split(',').map(Number)
  var query = [[bbox[1], bbox[3]], [bbox[0], bbox[2]]] // left,bottom,right,top
  var queryStream = osmdb.queryStream(query)
  var queryStreamXml = pumpify(queryStream, toxml(query))
  return queryStreamXml
}

module.exports = bboxQueryStream
