# osm-p2p-server

[![Build Status](https://img.shields.io/travis/digidem/osm-p2p-server.svg)](https://travis-ci.org/digidem/osm-p2p-server)
[![npm](https://img.shields.io/npm/v/osm-p2p-server.svg)](https://www.npmjs.com/package/osm-p2p-server)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?maxAge=2592000)](http://standardjs.com/)

> Peer-to-peer [OpenStreetMap API v0.6][1] Server

[1]: http://wiki.openstreetmap.org/wiki/API_v0.6

An implementation of the [OpenStreetMap API v0.6][1] for [`osm-p2p-db`](https://www.npmjs.com/package/osm-p2p-db), a peer-to-peer OSM database. It runs on [node.js](https://nodejs.org/) or, if you are creative, also in the browser. Data is stored in a [LevelUP](https://github.com/Level/levelup) database. There is no need to set up a database, everything you need to get started is available as a single package that you can [install from npm](#install).

`osm-p2p-server` is tested and working with [iD Editor](https://github.com/openstreetmap/iD) - it appears as identical to the standard [OSM API][1]. It should theoretically work in the future with other editors such as [JOSM](https://josm.openstreetmap.de) but `osm-p2p-server` needs to use at least 64-bit ids to avoid collisions, and JOSM currently still uses 32-bit integers for some ids, such as changeset ids and version numbers.

`osm-p2p-server` is designed to run locally on each client. Synchronize data between clients by [replicating the `osm-p2p-db` database](https://github.com/digidem/osm-p2p-db#replication). You can implement replication over wifi, bluetooth or via USB thumb drives (examples coming soon).

This module is for developers who want to build their own OSM tools. For users who want a one-click install of `osm-p2p-server` with iD Editor see [Mapeo Desktop](https://github.com/digidem/mapeo-desktop).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Routes](#routes)
- [API](#api)
- [REST API](#rest-api)
- [Differences to OSM API v0.6](#differences-to-osm-api-v06)
- [Contribute](#contribute)
- [License](#license)

## Install

You will need to first [install node.js](https://nodejs.org/en/)

```
npm install osm-p2p-server
```

For the latest beta:

```
npm install osm-p2p-server@beta
```

## Usage

```
usage: osm-p2p-server {OPTIONS}

-h --help     Show this message
-p --port     Listen on a port. Default: 5000
-d --datadir  Store data in this directory. Default: ./osm-p2p.db

```

## Routes

`osm-p2p-server` currently implements the following routes from the [OSM API v0.6][1]:

- [x] `GET /capabilities`
- [x] `GET /map`
- [x] `PUT /changeset/create`
- [x] `POST /changeset/:id/upload`
- [x] `PUT /changeset/:id/close`
- [x] `GET /map`
- [x] `GET /:type(nodes|ways|relations)?:ktype(nodes|ways|relations)=:ids`
- [x] `GET /:type(node|way|relation)/:id`
- [x] `GET /:type(node|way|relation)/:id/:version`
- [x] `GET /:type(node|way|relation)/:id`
- [x] `GET /:type(node|way|relation)/:id/history`
- [ ] `GET /:type(way|relation)/:id/full`

## API

``` js
var osmrouter = require('osm-p2p-server')
```

### var router = osmrouter(osm)

Create a new OpenStreetMap `router` given an
[`osm-p2p-db`](https://npmjs.com/package/osm-p2p-db) handle `osm`.

### var m = router.handle(req, res)

Match the `req.method` and `req.url` and dispatch `m.fn(m, req, res)` and return
the match object if there is a match, or else `null`.

### var m = router.match(method, url)

Return a match object `m` if `method` and `url` can be handled by the server.
Used internally by `router.handle()`.
The match object for `router.match('GET', '/node/1234')` would be:

```js
{
  params: {
    type: 'node',
    id: '1234',
  },
  splats: [],
  route: '/:type(node|way|relation)/:id',
  fn: [Function],
  next: [Function]
}
```

### API Example

```js
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

### Use as Express middleware

```js
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
```

## REST API

See the documentation for the [OSM API v0.6][1] - `osm-p2p-server` replicates that API as faithfully as possible.

## Differences to OSM API v0.6

The main differences to the OSM API v0.6 are related to the peer-to-peer architecture of `osm-p2p-server`. Ids are randomly generated, rather than sequential integers. Version ids are hashes rather than integers. For more details read [`osm-p2p-db` Architecture](https://github.com/digidem/osm-p2p-db/blob/master/doc/architecture.markdown).

- If two users edit the same version of an entity (node|way|relation) then two versions will exist in the database. `osm-p2p-server` will not return `409: Conflict` if you try to modify or delete an entity which is not the most recent version, it will create a fork instead. Forks can be created if two users edit the same entity whilst disconnected and then later replicate the database.

- By default `osm-p2p-server` will only return the most recent 'fork', to maintain compatibility with tools that do not understand the concept of forked entities. To see all forks, append `?forks=true` to the URL and if multiple forks exist the returned data will include multiple entities with the same `id`, but different `version` ids.

- In changeset uploads (`/changeset/:id/upload`), the `version` property of each entity in the changeset
can be a comma-separated list of version hashes of the documents that the update will replace.
Use this to merge multiple forks into a single fork.

## Contributing

If something does not work as it should, please open an [Issue](/issues). [Pull Requests](/pulls) are welcome, please follow [JS Standard Style](http://standardjs.com/).

## License

[BSD (c) 2016 Digital Democracy](/LICENSE)
