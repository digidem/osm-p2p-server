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
