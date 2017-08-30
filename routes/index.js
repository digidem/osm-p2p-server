var router = require('routes')()

function route (str, f) { router.addRoute(str, f) }

route('GET /api(/0.6)?/capabilities', require('./misc_capabilities.js'))
route('GET /api/0.6/map', require('./misc_map.js'))
route('PUT /api/0.6/:type(changeset)/create', require('./changeset_create.js'))
route('POST /api/0.6/changeset/:id/upload', require('./changeset_upload.js'))
route('GET /api/0.6/changeset/:id/download', require('./changeset_download.js'))
route('PUT /api/0.6/changeset/:id/close', require('./changeset_close.js'))
route('PUT /api/0.6/:type(node|way|relation)/:id', require('./element_create.js'))
route('GET /api/0.6/:type(node|way|relation)/:id/history', require('./element_history.js'))
route('GET /api/0.6/:type(node|way|relation)/:id/:version', require('./element_version.js'))
route('GET /api/0.6/:type(nodes|ways|relations)', require('./element_multi_fetch.js'))
route('GET /api/0.6/:type(node|way|relation)/:id', require('./element_read.js'))
route('DELETE /api/0.6/:type(node|way|relation)/:id', require('./element_delete'))
route('GET /export', require('./export.js'))

module.exports = router
