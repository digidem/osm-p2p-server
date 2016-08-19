var test = require('tape')
var isISODate = require('isostring')

var createCloseChangeset = require('../../api/close_changeset')

test('closeChangeset no version specified', t => {
  t.plan(9)
  var testId = '12345'
  var testDocs = {'abcdef': {}}
  var mockedOsm = {
    get: function (id, cb) {
      t.equal(id, testId)
      t.equal(typeof cb, 'function')
      cb(null, testDocs)
    },
    put: function (id, doc, opts, cb) {
      t.equal(id, testId)
      t.equal(doc, testDocs.abcdef)
      t.true(isISODate(doc.closed_at), 'created_at timestamp is added')
      t.true(Date.now() - Date.parse(doc.closed_at) < 100, 'created_at should be pretty much now')
      t.equal(typeof cb, 'function')
      t.deepEqual(opts, {links: undefined})
      cb()
    }
  }
  var closeChangeset = createCloseChangeset(mockedOsm)
  closeChangeset(testId, function (err) {
    t.error(err)
  })
})

test('closeChangeset specific version', t => {
  t.plan(7)
  var testId = '12345'
  var testDocs = {
    'A': {},
    'B': {}
  }
  var mockedOsm = {
    get: function (id, cb) {
      t.equal(id, testId)
      t.equal(typeof cb, 'function')
      cb(null, testDocs)
    },
    put: function (id, doc, opts, cb) {
      t.equal(id, testId)
      t.equal(doc, testDocs.B)
      t.equal(typeof cb, 'function')
      t.deepEqual(opts, {links: ['B']})
      cb()
    }
  }
  var closeChangeset = createCloseChangeset(mockedOsm)
  closeChangeset(testId, 'B', function (err) {
    t.error(err)
  })
})

test('closeChangeset not found error', t => {
  t.plan(4)
  var testId = '12345'
  var testDocs = {}
  var mockedOsm = {
    get: function (id, cb) {
      cb(null, testDocs)
    },
    put: function (id, doc, opts, cb) {
      cb()
    }
  }
  var closeChangeset = createCloseChangeset(mockedOsm)
  closeChangeset(testId, function (err) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'NotFoundError', 'error type is NotFoundError')
    t.ok(/12345/.test(err.message), 'error include error id')
    t.equal(err.status, 404, 'error status code is 404')
  })
})

test('closeChangeset forked error', t => {
  t.plan(3)
  var testId = '12345'
  var testDocs = {
    'A': {},
    'B': {}
  }
  var mockedOsm = {
    get: function (id, cb) {
      cb(null, testDocs)
    },
    put: function (id, doc, opts, cb) {
      cb()
    }
  }
  var closeChangeset = createCloseChangeset(mockedOsm)
  closeChangeset(testId, function (err) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'ForkedChangesetError', 'error type is ForkedChangesetError')
    t.equal(err.status, 409, 'error status code is 409')
  })
})

test('closeChangeset version not found error', t => {
  t.plan(4)
  var testId = '12345'
  var testDocs = {
    'A': {},
    'B': {}
  }
  var mockedOsm = {
    get: function (id, cb) {
      cb(null, testDocs)
    },
    put: function (id, doc, opts, cb) {
      cb()
    }
  }
  var closeChangeset = createCloseChangeset(mockedOsm)
  closeChangeset(testId, 'C', function (err) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'NotFoundError', 'error type is NotFoundError')
    t.ok(/version: C/.test(err.message), 'error includes version id')
    t.equal(err.status, 404, 'error status code is 404')
  })
})

test('closeChangeset closed error', t => {
  t.plan(5)
  var testId = '12345'
  var testDocs = {
    'A': {
      closed_at: Date.now()
    }
  }
  var mockedOsm = {
    get: function (id, cb) {
      cb(null, testDocs)
    },
    put: function (id, doc, opts, cb) {
      cb()
    }
  }
  var closeChangeset = createCloseChangeset(mockedOsm)
  closeChangeset(testId, function (err) {
    t.true(err instanceof Error, 'returns error')
    t.equal(err.name, 'ClosedChangesetError', 'error type is ClosedChangesetError')
    t.ok(err.message.includes(testId), 'error includes id')
    t.ok(err.message.includes(testDocs.A.closed_at), 'error includes closed_at date')
    t.equal(err.status, 409, 'error status code is 409')
  })
})
