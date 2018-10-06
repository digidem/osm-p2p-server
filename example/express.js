var kosm = require('kappa-osm')
var kcore = require('kappa-core')
var level = require('level')
var raf = require('random-access-file')

var mkdirp = require('mkdirp')
mkdirp.sync('/tmp/osm-p2p/storage')

var osm = kosm({
  index: level('/tmp/osm-p2p/index'),
  core: kcore('/tmp/osm-p2p/core', { valueEncoding: 'json' }),
  storage: function (name, cb) { cb(null, raf('/tmp/osm-p2p/storage/'+name)) }
})

var express = require('express')
var router = require('../')(osm)

var app = express()

app.use('/api/0.6', function (req, res, next) {
  if (!router.handle(req, res)) next()
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
