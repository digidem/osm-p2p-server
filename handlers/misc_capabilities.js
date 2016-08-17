var wrapResponse = require('../transforms/wrap_response.js')
var xml2js = require('xml2js')

var builder = new xml2js.Builder({headless: true})

var capabilities = builder.buildObject({
  api: {
    version: {$: {minimum: 0.6, maximum: 0.6}},
    area: {$: {maximum: 0.25}},
    waynodes: {$: {maximum: 2000}},
    tracepoints: {$: {per_page: 5000}},
    timeout: {$: {seconds: 300}},
    status: {$: {database: 'online', api: 'online', gpx: 'online'}}
  }
})

module.exports = function (req, res) {
  res.end(wrapResponse.fn(capabilities))
}
