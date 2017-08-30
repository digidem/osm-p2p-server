module.exports = function createApi (osm) {
  return {
    getMap: require('./get_map.js')(osm),
    getElement: require('./get_element.js')(osm),
    createElement: require('./create_element.js')(osm),
    createChangeset: require('./create_changeset.js')(osm),
    closeChangeset: require('./close_changeset.js')(osm),
    getChanges: require('./get_changes.js')(osm),
    putChanges: require('./put_changes.js')(osm)
  }
}
