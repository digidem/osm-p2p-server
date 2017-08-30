var exportOsm = require('osm-p2p-geojson')

module.exports = function (req, res, api, params, next) {
  var bbox = [-85, -180, 85, 180]

  var source = api.getMap(bbox, {order: 'type', forks: false})

  var geojsonify = exportOsm(api.osm)

  source.pipe(geojsonify).pipe(res)
}
