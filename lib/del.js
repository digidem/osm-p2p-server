var once = require('once')

module.exports = function (osm, ops, cb) {
  if (ops.length === 0) return cb(null, [], [])
  var excheck = [], skip = {}, batch = [], results = []
  ops.forEach(function (op) {
    excheck.push(op)
    var links = op.version !== undefined
      ? (op.version || '').split(/\s*,\s*/).filter(Boolean)
      : undefined
    batch.push({
      type: 'del',
      id: op.id,
      links: links
    })
    results.push({
      type: op.type,
      attr: { old_id: op.oldId }
    })
  })
  if (excheck.length === 0) return done()
  var cancel = false
  var pending = excheck.length * 2 + 1
  var exids = {}
  excheck.forEach(function (op) {
    exids[op.id] = op
  })
  excheck.forEach(function (op) {
    osm.refs.list(op.id, function (err, refs) {
      if (cancel) return
      if (err) {
        cancel = true
        return cb({ code: 500, message: err })
      }
      refs = refs.filter(function (ref) {
        return !exids.hasOwnProperty(ref.value)
      })
      if (refs.length > 0 && op.ifUnused) {
        skip[op.id] = true
      } else if (refs.length > 0) {
        cancel = true
        getTypes(osm, refs, function (err, types) {
          if (err) {
            cancel = true
            return cb({ code: 500, message: err })
          }
          var msg = types.map(function (t,i) {
            return 'Node #'+op.id+' is still used by '+t
              +' #'+refs[i].value+'.'
          }).join('\n')
          return cb({ code: 412, message: msg })
        })
      }
      if (--pending === 0) done()
    })
    osm.get(op.id, function (err, values) {
      if (cancel) return
      if (err) {
        cancel = true
        return cb({ code: 500, message: err })
      }
      var len = Object.keys(values).length
      if (len === 0 && op.ifUnused) {
        skip[op.id] = true
      } else if (len === 0) {
        cancel = true
        return cb({ code: 404, message: 'Element not found: ' + op.id })
      }
      if (--pending === 0) done()
    })
  })
  if (--pending === 0) done()

  function done () {
    cb(null, batch.filter(function (row) {
      return !skip.hasOwnProperty(row.id)
    }), results)
  }
}

function getTypes (osm, refs, cb) {
  cb = once(cb)
  var pending = 1 + refs.length
  var types = []
  refs.forEach(function (ref, i) {
    osm.log.get(ref.key, function (err, doc) {
      if (err) return cb(err)
      types[i] = doc.value && doc.value.v && doc.value.v.type
      if (--pending === 0) cb(null, types)
    })
  })
  if (--pending === 0) cb(null, types)
}
