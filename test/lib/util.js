var test = require('tape')

var util = require('../../lib/util')

test('nodes2refs', t => {
  var input = {
    nodes: ['a', 'b'],
    lat: 5,
    lon: 5
  }
  var expected = {
    refs: ['a', 'b'],
    lat: 5,
    lon: 5
  }
  t.deepEqual(util.nodes2refs(input), expected, 'replaced nodes prop with refs')
  t.notEqual(util.nodes2refs(input), input, 'does not mutate input')
  t.end()
})

test('map function', t => {
  var input = {
    refs: ['a', 'b'],
    lat: 5,
    lon: 5
  }
  var expected = {
    nodes: ['a', 'b'],
    lat: 5,
    lon: 5
  }
  t.deepEqual(util.refs2nodes(input), expected, 'replaced refs prop with nodes')
  t.notEqual(util.refs2nodes(input), input, 'does not mutate input')
  t.end()
})

test('cmpFork latest first', t => {
  var input = [{
    id: 1,
    timestamp: '2017-01-14T16:43:38.968Z',
    version: 'b'
  }, {
    id: 2,
    timestamp: '2017-01-14T16:43:36.100Z',
    version: 'a'
  }]
  t.equal(input.sort(util.cmpFork)[0].id, 1)
  t.end()
})

test('cmpFork latest last', t => {
  var input = [{
    id: 1,
    timestamp: '2017-01-14T16:43:36.100Z',
    version: 'b'
  }, {
    id: 2,
    timestamp: '2017-01-14T16:43:38.968Z',
    version: 'a'
  }]
  t.equal(input.sort(util.cmpFork)[0].id, 2)
  t.end()
})

test('cmpFork only first has timestamp', t => {
  var input = [{
    id: 1,
    timestamp: '2017-01-14T16:43:36.100Z',
    version: 'b'
  }, {
    id: 2,
    version: 'a'
  }]
  t.equal(input.sort(util.cmpFork)[0].id, 1)
  t.end()
})

test('cmpFork only second has timestamp', t => {
  var input = [{
    id: 1,
    version: 'b'
  }, {
    id: 2,
    timestamp: '2017-01-14T16:43:36.100Z',
    version: 'a'
  }]
  t.equal(input.sort(util.cmpFork)[0].id, 2)
  t.end()
})

test('cmpFork no timestamps (use version)', t => {
  var input = [{
    id: 1,
    version: 'b'
  }, {
    id: 2,
    version: 'a'
  }]
  t.equal(input.sort(util.cmpFork)[0].id, 2)
  t.end()
})

test('cmpFork no timestamps (use version)', t => {
  var input = [{
    id: 2,
    version: 'a'
  }, {
    id: 1,
    version: 'b'
  }]
  t.equal(input.sort(util.cmpFork)[0].id, 2)
  t.end()
})
