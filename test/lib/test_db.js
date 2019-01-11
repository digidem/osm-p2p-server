var kosm = require('kappa-osm')
var kcore = require('kappa-core')
var memdb = require('memdb')
var ram = require('random-access-memory')

var slowdb = require('./slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function testDb (cb) {
  return kosm({
    index: DELAY ? slowdb({delay: DELAY}) : memdb(),
    core: kcore(ram, { valueEncoding: 'json' }),
    storage: function (name, cb) { cb(null, ram()) }
  })
}

module.exports = testDb
