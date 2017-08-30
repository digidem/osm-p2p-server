var osmApi = require('osm-p2p-api')

module.exports = function createApi (osm) {
  var api = osmApi(osm)
  return {
    getMap: api.getMap,
    getElement: require('./get_element.js')(osm),
    createElement: require('./create_element.js')(osm),
    createChangeset: require('./create_changeset.js')(osm),
    closeChangeset: require('./close_changeset.js')(osm),
    getChanges: require('./get_changes.js')(osm),
    putChanges: require('./put_changes.js')(osm)
  }
}
