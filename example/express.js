var osmdb = require('osm-p2p')
var express = require('express')

var osmRouter = require('../')

var app = express()
var osm = osmdb('/tmp/osm-p2p')

app.use('/api/0.6', osmRouter(osm))

app.use(function handleError (err, req, res, next) {
  if (!err) return
  if (!res.headersSent) {
    res.statusCode = err.status || err.statusCode || 500
    res.setHeader('content-type', 'text/plain')
    res.end(err.message + '\n')
  } else {
    next(err)
  }
})

app.listen(5000, function () {
  console.log('osm-p2p-server listening on port 5000!')
})
