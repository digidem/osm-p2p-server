# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Added
- Add `timestamp` to newly created elements.
- Add `created_at` timestamp to new changesets.

### Changed
- **BREAKING** (Possibly): Empty nodes in returned xml are self-closing tags rather than empty e.g. `<node id="1" />` vs `<node id="1"></node>`. This matches OSM Ruby Port, and is likely not breaking but it did break our tests.
- **BREAKING**: Closed changesets now have attribute `created_at` rather than `createdAt` to be consistent with OSM API. Still checks for `createdAt` in legacy dbs.
- Sort forked elements in responses, so that clients that only read the first response are consistent.

### Fixed
- Always set xml content-encoding to utf-8 (Very important since the default charset is ISO-8859-1 see http://www.w3.org/International/articles/http-charset/index)
- Set headers content-encoding: identity and no-cache for all routes
- Correctly parse `id` for closing a forked changeset.
- `members` and `nodes` are returned before `tags` in Xml.

### Removed

[Unreleased]: https://github.com/digidem/osm-p2p-server/compare/1.12.2...HEAD
