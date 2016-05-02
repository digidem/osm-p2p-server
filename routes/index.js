module.exports = [{
  method: 'get',
  path: '/api/(0.6)?/capabilities',
  GetRoute: require('./get_capabilities')
}, {
  method: 'get',
  path: '/api/0.6/map?*',
  GetRoute: require('./get_map')
}, {
  method: 'post',
  path: '/api/changeset',
  GetRoute: require('./post_changeset')
}]
