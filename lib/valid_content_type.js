var contentType = require('content-type')

module.exports = function isValidContentType (req) {
  try {
    if (/\/xml$/.test(contentType.parse(req).type)) {
      return true
    }
  } catch (e) {}
}
