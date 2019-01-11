var test = require('tape')
var osmdb = require('../lib/test_db')
var isISODate = require('isostring')

var createCreateChangeset = require('../../api/create_changeset')

test('createChangeset', t => {
  t.plan(9)
  var testChangeset = {
    type: 'changeset',
    tags: {
      created_by: 'JOSM 1.61',
      comment: 'Just adding some streetnames'
    }
  }
  var testNode = {}
  var testId
  var mockedOsm = {
    put: function (id, changeset, cb) {
      testId = id
      t.true(id.length > 16)
      t.equal(typeof id, 'string', 'called with string id')
      t.deepEqual(changeset.tags, testChangeset.tags, 'called with same tags')
      t.false(testChangeset.hasOwnProperty('created_at'), 'changeset not mutated')
      t.equal(typeof cb, 'function', 'callback is a function')
      cb(null, testNode)
    }
  }
  var createChangeset = createCreateChangeset(mockedOsm)
  t.equal(typeof createChangeset, 'function')
  createChangeset(testChangeset, function (err, id, elm) {
    t.equal(err, null)
    t.equal(id, testId)
    t.equal(elm, testNode)
  })
})

test('createChangeset real db', t => {
  t.plan(5)
  var osm = osmdb()
  var testChangeset = {
    type: 'changeset',
    tags: {
      created_by: 'JOSM 1.61',
      comment: 'Just adding some streetnames'
    }
  }
  var createChangeset = createCreateChangeset(osm)
  createChangeset(testChangeset, function (err, id, elm) {
    t.equal(err, null)
    t.equal(id, elm.id)
    t.deepEqual(elm.tags, testChangeset.tags)
    t.true(isISODate(elm.created_at), 'adds ISO8601 date field created_at')
    t.true(Date.now() - Date.parse(elm.created_at) < 500, 'created_at should be pretty much now')
  })
})
