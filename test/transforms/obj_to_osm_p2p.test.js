var test = require('tape')
var stream = require('stream')

var obj2P2p = require('../../transforms/obj_to_osm_p2p')

test('exports instance of stream', t => {
  t.true(obj2P2p() instanceof stream.Stream)
  t.end()
})

test('map function', t => {
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
  t.deepEqual(obj2P2p.fn(input), expected, 'replaced nodes prop with refs')
  t.notEqual(obj2P2p.fn(input), input, 'does not mutate input')
  t.end()
})
