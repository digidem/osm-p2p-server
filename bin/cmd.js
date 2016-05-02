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
if (argv.help || argv._[0] === 'help') return usage(0)

var osmdb = require('osm-p2p')
var osm = osmdb(argv.datadir)
var osmrouter = require('../')
var router = osmrouter(osm)
var version = require('../package.json').version

var http = require('http')
var server = http.createServer(function (req, res) {
  if (router.handle(req, res)) {}
  else if (req.url === '/') {
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

function usage (code) {
  var r = fs.createReadStream(path.join(__dirname, 'usage.txt'))
  if (code) r.once('end', function () { process.exit(code) })
  r.pipe(process.stdout)
}
