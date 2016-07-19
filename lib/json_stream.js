var through = require('through2')

module.exports = through.obj(function write (row, enc, next) {
  var element = {}
  for (var prop in row) {
    if (!row.hasOwnProperty(prop)) continue
    if (prop === 'refs') {
      element.nodes = row.refs
    } else {
      element[prop] = row[prop]
    }
  }
  next(null, element)
})
