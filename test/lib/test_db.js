var osmdb = require('osm-p2p-db')
var memdb = require('memdb')
var hyperlog = require('hyperlog')
var memstore = require('memory-chunk-store')

var slowdb = require('./slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function testDb (cb) {
  return osmdb({
    db: DELAY ? slowdb({delay: DELAY}) : memdb(),
    log: hyperlog(memdb(), { valueEncoding: 'json' }),
    store: memstore(4096)
  })
}

module.exports = testDb
