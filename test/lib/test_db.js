var memdb = require('memdb')
var hyperdb = require('hyperdb')
var hyperosm = require('hyperdb-osm')
var ram = require('random-access-memory')
var Grid = require('grid-point-store')

var slowdb = require('./slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function testDb (cb) {
  var db = hyperdb(ram, { valueEncoding: 'json' })
  return hyperosm({
    db: db,
    index: DELAY ? slowdb({delay: DELAY}) : memdb(),
    pointstore: Grid({ store: memdb(), zoomLevel: 8 })
  })
}

module.exports = testDb
