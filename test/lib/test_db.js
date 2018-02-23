var memdb = require('memdb')
var hyperdb = require('hyperdb')
var hyperosm = require('hyperdb-osm')
var ram = require('random-access-memory')
var Grid = require('grid-point-store')

var slowdb = require('./slowdb.js')

var DELAY = process.env.OSM_P2P_DB_DELAY

function testDb (key) {
  var db
  if (key) db = hyperdb(ram, key ? key : undefined, { valueEncoding: 'json' })
  else db = hyperdb(ram, { valueEncoding: 'json' })
  return hyperosm({
    db: db,
    index: DELAY ? slowdb({delay: DELAY}) : memdb(),
    pointstore: Grid({ store: memdb(), zoomLevel: 8 })
  })
}

function createTwo (cb) {
  var a = testDb()
  a.db.ready(function () {
    var b = testDb(a.db.key)
    b.db.ready(function () {
      a.db.authorize(b.db.local.key, function () {
        cb(a, b)
      })
    })
  })
}

function createThree (cb) {
  var a = testDb()
  a.db.ready(function () {
    var b = testDb(a.db.key)
    b.db.ready(function () {
      var c = testDb(a.db.key)
      c.db.ready(function () {
        a.db.authorize(b.db.local.key, function () {
          b.db.authorize(c.db.local.key, function () {
            cb(a, b, c)
          })
        })
      })
    })
  })
}

module.exports = testDb
module.exports.createTwo = createTwo
module.exports.createThree = createThree
