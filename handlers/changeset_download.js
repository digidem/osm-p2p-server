/**
 * Download Changeset
 * http://wiki.openstreetmap.org/wiki/API_v0.6#Download:_GET_.2Fapi.2F0.6.2Fchangeset.2F.23id.2Fdownload
 */

var obj2Xml = require('../transforms/obj_to_xml.js')
var wrapResponse = require('../transforms/wrap_response.js')

module.exports = function (req, res, api, params, next) {
  api.getChanges(params.id, function (err, changes) {
    if (err) return next(err)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    res.end(toOsmChange(changes))
  })
}

function toOsmChange (changes) {
  var created = changes.filter(function (e) { return e.action === 'create' })
  var modified = changes.filter(function (e) { return e.action === 'modify' })
  var deleted = changes.filter(function (e) { return e.action === 'delete' })
  var xml = ''

  if (created.length) {
    xml += '<create>\n  ' +
      created.map(obj2Xml.fn).join('\n  ') +
      '\n</create>\n'
  }
  if (modified.length) {
    xml += '<modify>\n  ' +
      modified.map(obj2Xml.fn).join('\n  ') +
      '\n</modify>\n'
  }
  if (deleted.length) {
    xml += '<delete>\n' +
      deleted.map(obj2Xml.fn).join('\n  ') +
      '\n</delete>\n'
  }
  return wrapResponse.fn(xml, {root: 'osmChange'})
}
