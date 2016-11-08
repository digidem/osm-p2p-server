var h = require('../lib/h.js')
var version = require('../package.json').version

var capabilities = h('?xml', { version: '1.0', encoding: 'UTF-8' }, [
  h('osm', { version: 0.6, generator: 'osm-p2p v' + version }, [
    h('api', [
      h('version', { minimum: 0.6, maximum: 0.6 }),
      h('area', { maximum: 0.25 }), // in square degrees
      h('waynodes', { maximum: 2000 }),
      h('tracepoints', { per_page: 5000 }),
      h('timeout', { seconds: 300 }),
      h('status', { database: 'online', api: 'online', gpx: 'online' })
    ])
  ])
])

module.exports = function (req, res) {
  res.setHeader('content-type', 'text/xml; charset=utf-8')
  res.end(capabilities)
}
