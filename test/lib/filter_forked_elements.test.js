var test = require('tape')

var filterForkedElements = require('../../lib/filter_forked_elements')

test('duplicate nodes', function (t) {
  var elements = [
    {
      type: 'node',
      id: '123',
      version: 'foo',
      lon: 0,
      lat: 0
    },
    {
      type: 'node',
      id: '123',
      version: 'bar',
      lon: 1,
      lat: 1
    }
  ]

  var expected = [elements[1]]

  var actual = filterForkedElements(elements)

  t.deepEqual(actual, expected)
  t.end()
})

test('non-duplicate nodes', function (t) {
  var elements = [
    {
      type: 'node',
      id: '200',
      version: 'foo',
      lon: 0,
      lat: 0
    },
    {
      type: 'node',
      id: '123',
      version: 'bar',
      lon: 1,
      lat: 1
    }
  ]

  var expected = elements

  var actual = filterForkedElements(elements)

  t.deepEqual(actual, expected)
  t.end()
})

test('disparate ways', function (t) {
  var elements = [
    {
      type: 'way',
      id: '100',
      version: 'boop',
      nodes: ['123']
    },
    {
      type: 'way',
      id: '101',
      version: 'beep',
      nodes: ['124']
    },
    {
      type: 'node',
      id: '123',
      version: 'foo',
      lon: 0,
      lat: 0
    },
    {
      type: 'node',
      id: '124',
      version: 'bar',
      lon: 1,
      lat: 1
    }
  ]

  var expected = elements

  var actual = filterForkedElements(elements)

  t.deepEqual(actual.sort(cmpElement), expected.sort(cmpElement))
  t.end()
})

test('forked ways', function (t) {
  var elements = [
    {
      type: 'way',
      id: '100',
      version: 'boop',
      nodes: ['123', '124']
    },
    {
      type: 'way',
      id: '100',
      version: 'beep',
      nodes: ['123']
    },
    {
      type: 'node',
      id: '123',
      version: 'foo',
      lon: 0,
      lat: 0
    },
    {
      type: 'node',
      id: '124',
      version: 'bar',
      lon: 1,
      lat: 1
    }
  ]

  var expected = elements.slice(1, 3)

  var actual = filterForkedElements(elements)

  t.deepEqual(actual.sort(cmpElement), expected.sort(cmpElement))
  t.end()
})

test('forked ways /w a delete', function (t) {
  var elements = [
    {
      type: 'way',
      id: '100',
      version: 'boop',
      nodes: ['123', '124']
    },
    {
      type: 'way',
      id: '100',
      version: 'beep',
      nodes: ['123']
    },
    {
      type: 'node',
      id: '123',
      version: 'foo',
      lon: 0,
      lat: 0
    },
    {
      type: 'node',
      id: '124',
      version: 'bar',
      lon: 1,
      lat: 1
    }
  ]

  var expected = elements.slice(1, 3)

  var actual = filterForkedElements(elements)

  t.deepEqual(actual.sort(cmpElement), expected.sort(cmpElement))
  t.end()
})

function cmpElement (a, b) {
  if (a.id === b.id) return b.version - a.version
  else return b.id - a.id
}
