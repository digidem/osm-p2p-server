var test = require('tape')
var isISODate = require('isostring')

var createCreateElement = require('../../api/create_element')

test('createElement', t => {
  t.plan(12)
  var testElement = {
    type: 'node',
    lat: 2.0,
    lon: -3.0,
    changeset: 'A',
    tags: {
      highway: 'bus_stop',
      name: 'Main Street'
    }
  }
  var testNode = {}
  var testId
  var mockedOsm = {
    get: function (changesetId, cb) {
      t.equal(changesetId, testElement.changeset)
      t.equal(typeof cb, 'function')
      cb(null, {A: {}})
    },
    put: function (id, element, cb) {
      testId = id
      t.true(id.length > 16)
      t.equal(typeof id, 'string', 'called with string id')
      t.deepEqual(element.tags, testElement.tags, 'called with same tags')
      t.false(testElement.hasOwnProperty('timestamp'), 'element not mutated')
      t.true(isISODate(element.timestamp), 'element has ISO timestamp')
      t.equal(typeof cb, 'function', 'callback is a function')
      cb(null, testNode)
    }
  }
  var createElement = createCreateElement(mockedOsm)
  t.equal(typeof createElement, 'function')
  createElement(testElement, function (err, id, node) {
    t.error(err)
    t.equal(id, testId)
    t.equal(node, testNode)
  })
})

test('createElement no changeset ID error', t => {
  t.plan(3)
  var testElement = {
    type: 'node',
    lat: 2.0,
    lon: -3.0,
    tags: {
      highway: 'bus_stop',
      name: 'Main Street'
    }
  }
  var mockedOsm = {}
  var createElement = createCreateElement(mockedOsm)
  createElement(testElement, function (err, id, node) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'MissingChangesetIdError', 'error type is MissingChangesetIdError')
    t.equal(err.status, 400, 'error status code is 400')
  })
})

test('createElement missing changeset error', t => {
  t.plan(4)
  var testElement = {
    type: 'node',
    lat: 2.0,
    lon: -3.0,
    changeset: 'A',
    tags: {
      highway: 'bus_stop',
      name: 'Main Street'
    }
  }
  var mockedOsm = {
    get: function (changesetId, cb) {
      cb(null, {})
    }
  }
  var createElement = createCreateElement(mockedOsm)
  createElement(testElement, function (err, id, node) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'MissingChangesetError', 'error type is MissingChangesetError')
    t.ok(err.message.includes(testElement.changeset), 'error includes changeset id')
    t.equal(err.status, 400, 'error status code is 400')
  })
})

test('createElement closed changeset error', t => {
  t.plan(4)
  var testElement = {
    type: 'node',
    lat: 2.0,
    lon: -3.0,
    changeset: 'A',
    tags: {
      highway: 'bus_stop',
      name: 'Main Street'
    }
  }
  var mockedOsm = {
    get: function (changesetId, cb) {
      cb(null, {A: {closed_at: Date.now()}})
    }
  }
  var createElement = createCreateElement(mockedOsm)
  createElement(testElement, function (err, id, node) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'ClosedChangesetError', 'error type is ClosedChangesetError')
    t.ok(err.message.includes(testElement.changeset), 'error includes changeset id')
    t.equal(err.status, 409, 'error status code is 409')
  })
})
