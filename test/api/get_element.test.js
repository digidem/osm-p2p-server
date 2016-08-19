var test = require('tape')

var createGetElement = require('../../api/get_element')

test('getElement', t => {
  t.plan(5)
  var testId = '12345'
  var testDocs = {
    'A': {
      refs: [1, 2]
    },
    'B': {}
  }
  var mockedOsm = {
    get: function (id, cb) {
      t.equal(id, testId)
      t.equal(typeof cb, 'function')
      cb(null, testDocs)
    }
  }
  var getElement = createGetElement(mockedOsm)
  getElement(testId, (e, elements) => {
    t.equal(elements.length, 2, 'returns multiple forks')
    t.deepEqual(elements[0].nodes, testDocs.A.refs, 'maps refs to nodes')
    t.equal(elements.filter(e => e.id === testId).length, 2, 'elements have id property set')
  })
})

test('getElement missing error', t => {
  t.plan(4)
  var testId = '12345'
  var testDocs = {}
  var mockedOsm = {
    get: function (id, cb) {
      cb(null, testDocs)
    }
  }
  var getElement = createGetElement(mockedOsm)
  getElement(testId, (err, elements) => {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'NotFoundError', 'error type is NotFoundError')
    t.ok(err.message.includes(testId), 'error includes id')
    t.equal(err.status, 404, 'error status code is 404')
  })
})
