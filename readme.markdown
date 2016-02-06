# osm-p2p-server

serve [open street map 0.6](http://wiki.openstreetmap.org/wiki/API_v0.6)
api endpoints over a local p2p http server

# example

``` js
var osmdb = require('osm-p2p')
var osm = osmdb('/tmp/osm-p2p')

var osmrouter = require('osm-p2p-server')
var router = osmrouter(osm)

var http = require('http')
var server = http.createServer(function (req, res) {
  if (router.handle(req, res)) {}
  else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
```

# api

``` js
var osmrouter = require('osm-p2p-server')
```

## var router = osmrouter(osm)

Create a new open street maps server `router` given an
[osm-p2p-db](https://npmjs.com/package/osm-p2p-db) handle `osm`.

## var m = router.match(method, url)

Return a match object `m` if `method` and `url` can be handled by the server.

## var m = router.handle(req, res)

Match the `req.method` and `req.url` and dispatch `m.fn(m, req, res)` and return
the match object if there is a match.

# install

```
npm install osm-p2p-server
```

# license

BSD
