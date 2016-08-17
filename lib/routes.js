var router = require('routes')()

function route (str, f) { router.addRoute(str, f) }

route('GET /api/(0.6)?/capabilities', require('../handlers/misc_capabilities.js'))
route('GET /api/0.6/map?*', require('../handlers/misc_map.js'))
route('PUT /api/0.6/:type(changeset)/create', require('../handlers/changeset_create.js'))
route('POST /api/0.6/changeset/:id/upload', require('../handlers/changeset_upload.js'))
route('GET /api/0.6/changeset/:id/download', require('../handlers/changeset_download.js'))
route('PUT /api/0.6/changeset/:id/close', require('../handlers/changeset_close.js'))
route('PUT /api/0.6/:type(node|way|relation)/:id', require('../handlers/element_create.js'))
route('GET /api/0.6/:type(node|way|relation)/:id/history', require('../handlers/element_history.js'))
route('GET /api/0.6/:type(node|way|relation)/:id/:version', require('../handlers/element_version.js'))
route('GET /api/0.6/:type(nodes|ways|relations)\\?:ktype=:ids', require('../handlers/element_multi_fetch.js'))
route('GET /api/0.6/:type(node|way|relation)/:id', require('../handlers/element_read.js'))
route('DELETE /api/0.6/:type(node|way|relation)/:id', require('../handlers/element_delete'))

module.exports = router
