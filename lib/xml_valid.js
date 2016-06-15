var parse = require('sax').parser

module.exports = function (str) {
  var p = parse(true)
  var valid = true
  p.onerror = function (err) { valid = false }
  p.write(str)
  p.end()
  return valid
}
