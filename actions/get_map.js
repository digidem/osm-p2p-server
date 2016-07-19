var pumpify = require('pumpify')
var toJson = require('../lib/json_stream.js')
var checkRefExist = require('../lib/check_ref_ex.js')
var jsonToXml = require('../lib/json_to_xml.js')

module.exports = function getMap (bbox, osm, opts) {
  var query = [[bbox[1], bbox[3]], [bbox[0], bbox[2]]] // left,bottom,right,top
  var queryStream = osm.queryStream(query)
  var queryStreamJson = pumpify.obj(queryStream, checkRefExist(osm), toJson)
  return queryStreamJson
}
