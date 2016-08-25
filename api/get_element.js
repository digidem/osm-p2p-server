var xtend = require('xtend')

var errors = require('../lib/errors')
var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

module.exports = function (osm) {
  return function getElement (id, version, cb) {
    if (typeof version === 'function') {
      cb = version
      version = null
    }
    if (version) {
      getVersion(id, version, cb)
    } else {
      getForks(id, cb)
    }
  }

  function getForks (id, cb) {
    osm.get(id, function (err, docs) {
      if (err) return cb(err)
      var forks = Object.keys(docs)
      if (forks.length === 0) return cb(new errors.NotFound('element id: ' + id))
      forks = forks.map(function (key) {
        return xtend(docs[key], {
          id: id,
          version: key
        })
      }).map(toOsmObj.fn)
      cb(null, forks)
    })
  }

  function getVersion (id, version, cb) {
    osm.log.get(version, function (err, doc) {
      if (err && (/^notfound/.test(err) || err.notFound)) {
        err = errors(404, err)
      }
      if (err) return cb(err)
      var element = xtend(doc.value.v, {
        id: id,
        version: version
      })
      cb(null, toOsmObj.fn(element))
    })
  }
}
