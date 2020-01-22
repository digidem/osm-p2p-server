const osm2obj = require('osm2obj')
const through = require('through2')
const pumpify = require('pumpify')

module.exports = function (api, opts) {
  var stream = pumpify.obj()
  var original = osm2obj(opts)
  var out = through.obj(function (doc, _, cb) {
    if (!doc.version) return cb(null, doc)
    api.getElement(null, {version: doc.version}, function (err, old) {
      // if there's an error here, dont do anything, just fall back on osm2obj's default behavior
      if (err) return cb(null, doc)

      // If there's an existing element that's an observation,
      // Use that observation, and then patch the changes from iD editor to it.
      // This is necessary because incoming OSM changesets
      // are not required to maintain these non-OSM Mapeo attributes through the entire
      // lifecycle, so we patch these from the back end.

      // If you want to make any other items editable from the Territory
      // view, you'd need to add lines for each property that should be edited.
      if (old && old.type === 'observation') {
        var obs = Object.assign({}, old)
        obs.action = doc.action
        obs.changeset = doc.changeset
        obs.version = doc.version
        obs.lat = doc.lat
        obs.lon = doc.lon
        obs.tags = doc.tags
        return cb(null, obs)
      }
      return cb(null, doc)
    })
  })

  stream.setPipeline(original, out)
  return stream
}
