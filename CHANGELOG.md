# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

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

[2.0.0-beta]: https://github.com/digidem/osm-p2p-server/compare/1.12.2...2.0.0-beta
