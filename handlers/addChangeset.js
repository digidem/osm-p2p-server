var randombytes = require('randombytes')

function addChangeset (changeset, osmdb, callback) {
  var pending = 1
  var errors = []
  var keys = []
  var docs = {}
  var changes = changeset.changes

  changes.created.forEach(function (newEntity) {
    docs[newEntity.id] = randombytes(8).toString('hex')
    newEntity.id = docs[newEntity.id]
  })

  changes.created.forEach(function (newEntity) {
    var id = fix(docs, newEntity)
    pending++
    osmdb.put(id, newEntity, function (err) {
      if (err) errors.push(err)
      else keys.push(id)
      if (--pending === 0) done()
    })
  })

  changes.modified.forEach(function (modifiedEntity) {
    var id = fix(docs, modifiedEntity)
    pending++
    var opts = { links: modifiedEntity.version ? [modifiedEntity.version] : [] }
    osmdb.put(id, modifiedEntity, opts, function (err) {
      if (err) errors.push(err)
      else keys.push(id)
      if (--pending === 0) done()
    })
  })

  changes.deleted.forEach(function (deletedEntity) {
    var id = deletedEntity.id.replace(/^[nw]/, '')
    pending++
    var opts = { links: deletedEntity.version ? [deletedEntity.version] : [] }
    osmdb.del(id, opts, function (err) {
      if (err) errors.push(err)
      else keys.push(id)
      if (--pending === 0) done()
    })
  })

  // *TODO* What if pending !== 0 here? It will just hang right now.
  if (--pending === 0) done()

  function done () {
    if (errors.length) {
      var err = new Error(errors.map(String).join('\n'))
      err.statusCode = 500
      return callback(err)
    } else {
      callback(null, keys)
    }
  }
}

function fix (docs, entity) {
  var entityIsNode = entity.loc
  var entityIsWay = entity.nodes

  if (entityIsNode) {
    entity.lat = entity.loc[1]
    entity.lon = entity.loc[0]
    entity.type = 'node'
    delete entity.loc
  } else if (entityIsWay) {
    entity.type = 'way'
    entity.refs = entity.nodes
      .map(function (id) { return docs.hasOwnProperty(id) ? docs[id] : id })
      .map(function (id) { return id.replace(/^[nw]/, '') })
    delete entity.nodes
  }

  entity.timestamp = new Date().toISOString()
  var id = entity.id
  if (docs.hasOwnProperty(id)) id = docs[id]
  delete entity.id
  return id.replace(/^[nw]/, '')
}

module.exports = addChangeset
