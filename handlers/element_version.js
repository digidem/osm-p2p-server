var Readable = require('readable-stream').Readable
var toOsm = require('obj2osm')

module.exports = function (req, res, api, params, next) {
  api.getElement(params.id, params.version, function (err, element) {
    if (err) return next(err)
    var r = new Readable({objectMode: true})
    r.on('error', next)
    r.push(element)
    r.push(null)
    res.setHeader('content-type', 'text/xml; charset=utf-8')
    var t = toOsm({bounds: false}).on('error', next)
    r.pipe(t).pipe(res)
  })
}
