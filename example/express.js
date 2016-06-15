var osmdb = require('osm-p2p')
var osm = osmdb('/tmp/osm-p2p')

var osmRoutes = require('../routes')
var express = require('express')
var app = express()

osmRoutes.forEach(function (route) {
  app[route.method](route.path, route.GetRoute(osm))
})

app.listen(5000, function () {
  console.log('osm-p2p listening on port 5000!')
})
