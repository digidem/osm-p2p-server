#!/usr/bin/env node
var fs = require('fs')
var path = require('path')

var minimist = require('minimist')
var argv = minimist(process.argv.slice(2), {
  default: {
    port: 5000,
    datadir: path.join(process.cwd(), 'osm-p2p.db')
  },
  alias: { p: 'port', d: 'datadir', h: 'help' }
})

if (argv.help || argv._[0] === 'help') {
  var r = fs.createReadStream(path.join(__dirname, 'usage.txt'))
  r.once('end', function () { process.exit(0) })
  r.pipe(process.stdout)
} else {
  var kosm = require('kappa-osm')
  var kcore = require('kappa-core')
  var level = require('level')
  var raf = require('random-access-file')

  var mkdirp = require('mkdirp')
  mkdirp.sync(argv.datadir + '/storage')

  var osm = kosm({
    index: level(argv.datadir + '/index', { valueEncoding: 'binary' }),
    core: kcore(argv.datadir + '/core', { valueEncoding: 'json' }),
    storage: function (name, cb) { cb(null, raf(argv.datadir + '/storage/'+name)) }
  })

  var router = require('../')(osm)
  var version = require('../package.json').version

  var http = require('http')
  var server = http.createServer(function (req, res) {
    if (router.handle(req, res)) {
    } else if (req.url === '/') {
      res.end('osm-p2p-server ' + version + '\n')
    } else {
      res.statusCode = 404
      res.end('not found\n')
    }
  })
  server.listen(argv.port, function () {
    console.log('http://127.0.0.1:' + server.address().port)
    console.log('database location: ' + path.resolve(argv.datadir))
  })
}
