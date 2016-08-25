var router = require('routes')()

function route (str, f) { router.addRoute(str, f) }

route('GET /capabilities', require('./misc_capabilities.js'))
route('GET /map?*', require('./misc_map.js'))
route('PUT /:type(changeset)/create', require('./changeset_create.js'))
route('POST /changeset/:id/upload', require('./changeset_upload.js'))
route('GET /changeset/:id/download', require('./changeset_download.js'))
route('PUT /changeset/:id/close', require('./changeset_close.js'))
route('PUT /:type(node|way|relation)/:id', require('./element_create.js'))
route('GET /:type(node|way|relation)/:id/history', require('./element_history.js'))
route('GET /:type(node|way|relation)/:id/:version', require('./element_version.js'))
route('GET /:type(nodes|ways|relations)\\?:ktype=:ids', require('./element_multi_fetch.js'))
route('GET /:type(node|way|relation)/:id', require('./element_read.js'))
route('DELETE /:type(node|way|relation)/:id', require('./element_delete'))

module.exports = router
