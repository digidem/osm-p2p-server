var osmdb = require('osm-p2p')
var osm = osmdb('/tmp/osm-p2p')
var express = require('express')

var routes = require('../lib/routes').routes
var api = require('../api')(osm)

var app = express()

// routes are exported as objects with props:
// `src`: method in uppercase, followed by a space, followed by the route path
// `fn`: the route handler function, must be called with (req, res, api, params, next)
// Alternatively if you want to use your own route paths you can require
// route handlers directly from `../handlers/`

routes.forEach(function (route) {
  var method = route.src.split(' ')[0].toLowerCase()
  var path = route.src.split(' ').slice(1).join(' ')
  app[method](path, function (req, res, next) {
    route.fn(req, res, api, req.params, next)
  })
})

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
