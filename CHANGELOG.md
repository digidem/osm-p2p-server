# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [2.1.4]
### Fixed
- Fixed incorrect case where nodes belonging to a deleted way were being
  returned in queries

## [2.1.3]
### Added
- Added `nyc` for test running, `codecov` for coverage
### Changed
- Upgraded `collect-transform-stream@1.1.1`
- Use TAP v10 + parallel tests
- Removed timeout on tests
### Fixed
- Fixed OSM API upload failing when ways come before nodes ([#31](https://github.com/digidem/osm-p2p-server/issues/31))

## [2.1.2]
### Fixed
- Removed unused dev dependency (was already a regular dep)

## [2.1.1]
### Fixed
- Removed rogue `console.log`

## [2.1.0]
### Added
- Add a timestamp to elements in a changeset upload with creation/modification time (on the server)

### Fixed
- The latest fork should be returned if forks != `true`, and forks with a timestamp should be preferred over forks without a timestamp (legacy elements do not have a timestamp). The fork sort/compare function was incorrect.

## [2.0.4]
### Fixed
- Correctly respect json output when `?forks=true` for `/map` endpoint
- Do not return 'ghost points' from forked ways when forks are not returned

## [2.0.3]
### Changed
- Add callback to server cleanup/teardown in tests - necessary for osm-p2p-server-sw tests

## [2.0.2]
### Fixed
- Additional query string parameters do not break route matching (previously route matching was dependent on the order of query string parameters and including any query string parameter would cause route matching to 404)
- All routes should return the correct charset (utf-8) on content-type, including error responses. This avoids strange bugs that might have resulted from the assumed charset of ISO-8859-1.

### Changed
- Update `split_delete_way.js` test so that it will run in the browser for osm-p2p-server-sw.

## [2.0.1]
### Fixed
- Validate bbox on `map` requests, avoid uncaught error on invalid bbox.

## [2.0.0]
- Release.

## [2.0.0-beta4]
### Fixed
- For changeset uploads, only check placeholder uniqueness within types. Previously we expected all placeholder ids to be unique within a changeset upload, but the OSM API v0.6 does not expect this, and clients (e.g. iD) can send the same placeholder id for both a node and a way in an upload. See https://github.com/openstreetmap/openstreetmap-website/blob/fc0aebc1a8ccad4ae9a3ac6435df00328e5a98e5/test/controllers/changeset_controller_test.rb#L398-L424

## [2.0.0-beta3]
### Added
- Return OsmJSON from `/map` endpoint if request `Accept` is `application/json`

### Fixed
- Value returned by changeset creation should not terminate in a newline

## [2.0.0-beta2]
### Changed
- **BREAKING**: Roll back change to URL prefix, keep `/api/0.6/` since it is hard-coded in several clients (e.g. iD)

## [2.0.0-beta]
### Added
- Add `timestamp` to newly created elements.
- Add `created_at` timestamp to new changesets.
- Use as Expresss.js middleware

### Changed
- **BREAKING** (Possibly): Empty nodes in returned xml are self-closing tags rather than empty e.g. `<node id="1" />` vs `<node id="1"></node>`. This matches OSM Ruby Port, and is likely not breaking but it did break our tests.
- **BREAKING**: Closed changesets now have attribute `created_at` rather than `createdAt` to be consistent with OSM API. Still checks for `createdAt` in legacy dbs.
- **BREAKING**: Only most recent fork is returned on `GET /:type(node|way|relation)/:id`, unless `?forks=true` query param is set.
- **BREAKING**: Only most recent forks are returned on `GET /:type(nodes|ways|relations)\\?:ktype=:ids`, unless `?forks=true` query param is set.
- **BREAKING**: Only most recent forks are returned of elements in `GET /map`, unless `?forks=true` query param is set.
- **BREAKING**: Routes no longer start with `/api/0.6/`, routes are now mounted on `/`
- Error messages should be more consistent
- More robust XML parsing

### Fixed
- Always set xml content-encoding to utf-8 (Very important since the default charset is ISO-8859-1 see http://www.w3.org/International/articles/http-charset/index)
- Set headers content-encoding: identity and no-cache for all routes
- Correctly parse `id` for closing a forked changeset.
- `members` and `nodes` are returned before `tags` in Xml.
- Delete operations must have changeset attribute set.

[2.1.0]: https://github.com/digidem/osm-p2p-server/compare/2.0.4...2.1.0
[2.0.4]: https://github.com/digidem/osm-p2p-server/compare/2.0.3...2.0.4
[2.0.3]: https://github.com/digidem/osm-p2p-server/compare/2.0.2...2.0.3
[2.0.2]: https://github.com/digidem/osm-p2p-server/compare/2.0.1...2.0.2
[2.0.1]: https://github.com/digidem/osm-p2p-server/compare/2.0.0...2.0.1
[2.0.0]: https://github.com/digidem/osm-p2p-server/compare/2.0.0-beta3...2.0.0
[2.0.0-beta4]: https://github.com/digidem/osm-p2p-server/compare/2.0.0-beta3...2.0.0-beta4
[2.0.0-beta3]: https://github.com/digidem/osm-p2p-server/compare/2.0.0-beta2...2.0.0-beta3
[2.0.0-beta2]: https://github.com/digidem/osm-p2p-server/compare/2.0.0-beta...2.0.0-beta2
[2.0.0-beta]: https://github.com/digidem/osm-p2p-server/compare/1.12.2...2.0.0-beta
