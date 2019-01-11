// work-around for bug elsewhere where ways and relations
// sometimes contain deleted records

var through = require('through2')

module.exports = function (osm) {
  return through.obj(write)

  function write (row, enc, next) {
    var pending = 1
    var nrefs = []
    ;((row.element && row.element.refs) || []).forEach(function (ref, i) {
      pending++
      osm.get(ref, function (err, docs) {
        if (err) return next(err)
        if (Object.keys(docs).length > 0) nrefs[i] = ref
        else console.log('SKIP', ref)
        if (--pending === 0) done()
      })
    })
    var nmembers = []
    ;((row.element && row.element.members) || []).forEach(function (m, i) {
      pending++
      osm.get(m.ref, function (err, doc) {
        if (err) return next(err)
        if (Object.keys(doc).length > 0) nmembers[i] = m
        else console.log('SKIP', m.ref)
        if (--pending === 0) done()
      })
    })
    if (--pending === 0) done()

    function done () {
      if (row.element && row.element.refs) {
        row.element.refs = nrefs.filter(Boolean)
      }
      if (row.element && row.element.members) {
        row.members = nmembers.filter(Boolean)
      }
      next(null, row)
    }
  }
}
