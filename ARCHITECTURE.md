# Architecture

The handler for each route from the [OSM API](http://wiki.openstreetmap.org/wiki/API_v0.6) is a separate file under [`/routes`](/routes). The handler is only responsible for turning the XML request into the an internal API call, and for turning the results of that call into properly formatted XML and sending it to the response. The internal API calls in [`/api`](/api) handle the logic of getting or putting the correct data in [`osm-p2p-db`](https://www.npmjs.com/package/osm-p2p-db). We don't use any higher-level frameworks like [Express](http://expressjs.com), [Hapi](http://hapijs.com) or [Koa](http://koajs.com), we just use the minimalist router [`routes`](https://www.npmjs.com/package/routes) to match URL paths and call the appropriate handler function, which expects vanilla node.js request and response objects - frameworks like Express wrap these objects with additional properties and methods, but that should not affect `osm-p2p-server`. You are free to wrap `osm-p2p-server` in whichever framework you prefer to add authentication or more advanced routing.

## Table of Contents

<!-- MarkdownTOC -->

- [Routes](#routes)
- [Internal API](#internal-api)
- [Custom Errors](#custom-errors)
- [Tests](#tests)
- [Code Style](#code-style)

<!-- /MarkdownTOC -->

## Routes

Each route handler under [`/routes`](/routes) is called by the router with the following arguments:

- `req` - an [http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
- `res` - an [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
- `api` - an object of [internal API](#internal-api) methods wrapping the `osm-p2p-db` instance.
- `params` - an object of matched route parameters. For example, for path `/node/5`, `params` would be `{type: 'node', id: '5'}`
- `next` - a function to pass to the next matched route. Call with an `Error` object to pass control to the error handler.

The REST API currently only speaks XML, like the OSM API, but it would be relatively easy to make it speak JSON by modifying these route handler functions - PRs welcome! Internally all OSM entities are represented as objects matching the [OSM JSON](http://overpass-api.de/output_formats.html#json) output format of the Overpass API. [`osm2json`](https://github.com/digidem/osm2json) and [`obj2osm`](https://github.com/digidem/obj2osm) handle the transformation from XML to objects and vice-versa.

## Internal API

Each method of the internal API is a separate file under [`/api`](/api). These are higher-level wrappers for the low-level [`osm-p2p-db` API](https://github.com/digidem/osm-p2p-db#api) and may eventual move into their own module. These API methods expect entities as objects matching the [OSM JSON](http://overpass-api.de/output_formats.html#json) format. Some methods, like [`getMap()`](/api/get_map.js) and [`getChanges()`](/api/get_changes.js) implement both a streaming interface and a regular callback pattern.

## Custom Errors

To keep errors more consistent we create [custom errors](/errors/index.js) which are defined in [`/errors/errors.json`](/errors/errors.json). These should match the errors defined in the OSM API specification as closely as possible.

## Tests

Tests use [tape](https://github.com/substack/tape). Integration tests sit directly under [/test](/test) with unit tests in subfolders matching the project layout. Right now test coverage is not 100% and PRs are welcome.

## Code Style

All code follows [JS Standard Style](http://standardjs.com/).
