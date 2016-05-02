var bboxQueryStream = require('../handlers/bbox_query_stream')

var GetMapRoute = function (osmdb) {
  return function getMapRoute (req, res, next) {
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    res.setHeader('content-disposition', 'attachment; filename="map.osm"')
    res.setHeader('content-encoding', 'identity')
    res.setHeader('cache-control', 'no-cache')

    var bboxString = req.params.bbox
    var resultStream = bboxQueryStream(bboxString, osmdb)
    resultStream.once('error', next)
    resultStream.pipe(res)
  }
}

module.exports = GetMapRoute
