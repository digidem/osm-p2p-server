var test = require('tape')
var stream = require('stream')

var p2p2Obj = require('../../transforms/osm_p2p_to_obj')

test('exports instance of stream', t => {
  t.true(p2p2Obj() instanceof stream.Stream)
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
  t.deepEqual(p2p2Obj.fn(input), expected, 'replaced nodes prop with refs')
  t.notEqual(p2p2Obj.fn(input), input, 'does not mutate input')
  t.end()
})
