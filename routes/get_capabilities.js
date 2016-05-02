var capabilities = require('../handlers/capabilities')

var GetCapabilitiesRoute = function () {
  return function getCapabilitiesRoute (req, res) {
    res.end(capabilities())
  }
}

module.exports = GetCapabilitiesRoute
