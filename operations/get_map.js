var toOsmObj = require('../transforms/osm_p2p_to_obj.js')
var checkRefExist = require('../lib/check_ref_ex.js')

module.exports = function getMap (bbox, osm, opts) {
  var query = [[bbox[1], bbox[3]], [bbox[0], bbox[2]]] // left,bottom,right,top
  var queryStream = osm.queryStream(query)
  var queryStreamJson = queryStream.pipe(checkRefExist(osm)).pipe(toOsmObj())
  return queryStreamJson
}
