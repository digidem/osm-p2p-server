var router = require('routes')()

var routes = [{
  path: 'GET /api/(0.6)?/capabilities',
  createHandler: require('../handlers/misc_capabilities.js')
}, {
  path: 'GET /api/0.6/map?*',
  createHandler: require('../handlers/misc_map.js'),
  operation: require('../operations/get_map.js')
}, {
  path: 'PUT /api/0.6/:type(changeset)/create',
  createHandler: require('../handlers/changeset_create.js'),
  operation: require('../operations/create_changeset.js')
}, {
  path: 'POST /api/0.6/changeset/:id/upload',
  createHandler: require('../handlers/changeset_upload.js')
}, {
  path: 'GET /api/0.6/changeset/:id/download',
  createHandler: require('../handlers/changeset_download.js')
}, {
  path: 'PUT /api/0.6/changeset/:id/close',
  createHandler: require('../handlers/changeset_close.js'),
  operation: require('../operations/close_changeset.js')
}, {
  path: 'PUT /api/0.6/:type(node|way|relation)/:id',
  createHandler: require('../handlers/element_create.js'),
  operation: require('../operations/create_element.js')
}, {
  path: 'GET /api/0.6/:type(node|way|relation)/:id/history',
  createHandler: require('../handlers/element_history.js')
}, {
  path: 'GET /api/0.6/:type(node|way|relation)/:id/:version',
  createHandler: require('../handlers/element_version.js'),
  operation: require('../operations/get_element_version.js')
}, {
  path: 'GET /api/0.6/:type(nodes|ways|relations)\\?:ktype=:ids',
  createHandler: require('../handlers/element_multi_fetch.js')
}, {
  path: 'GET /api/0.6/:type(node|way|relation)/:id',
  createHandler: require('../handlers/element_read.js'),
  operation: require('../operations/get_element.js')
}, {
  path: 'DELETE /api/0.6/:type(node|way|relation)/:id',
  createHandler: require('../handlers/element_delete')
}]

routes.forEach(function (route) {
  router.addRoute(route.path, route.createHandler(route.operation))
})

module.exports = router
