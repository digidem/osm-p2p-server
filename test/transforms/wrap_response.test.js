var test = require('tape')
var stream = require('stream')
var fromString = require('from2-string')
var concat = require('concat-stream')

var wrapResponse = require('../../transforms/wrap_response')
var version = require('../../package.json').version

test('exports instance of stream', t => {
  t.true(wrapResponse() instanceof stream.Stream)
  t.end()
})

test('default usage', t => {
  t.plan(2)
  var expected = `<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="osm-p2p v${version}">
<node />
</osm>
`
  t.equal(wrapResponse.fn('<node />'), expected)
  fromString('<node />').pipe(wrapResponse())
    .pipe(concat(buf => {
      t.equal(buf.toString(), expected)
    }))
})

test('custom root', t => {
  t.plan(2)
  var expected = `<?xml version="1.0" encoding="UTF-8"?>
<osmChange version="0.6" generator="osm-p2p v${version}">
<node />
</osmChange>
`
  t.equal(wrapResponse.fn('<node />', {root: 'osmChange'}), expected)
  fromString('<node />').pipe(wrapResponse({root: 'osmChange'}))
    .pipe(concat(buf => {
      t.equal(buf.toString(), expected)
    }))
})

test('bbox', t => {
  t.plan(2)
  var expected = `<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="osm-p2p v${version}">
<bounds minlon="1" minlat="2" maxlon="3" maxlat="4"/>
<node />
</osm>
`
  t.equal(wrapResponse.fn('<node />', {bbox: [1, 2, 3, 4]}), expected)
  fromString('<node />').pipe(wrapResponse({bbox: [1, 2, 3, 4]}))
    .pipe(concat(buf => {
      t.equal(buf.toString(), expected)
    }))
})
