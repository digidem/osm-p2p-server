var xtend = require('xtend')
var through = require('through2')
var readonly = require('read-only-stream')
var once = require('once')
var collect = require('collect-stream')

var errors = require('../errors')
var refs2nodes = require('../lib/util').refs2nodes

/**
 * Get the changes in a changeset, as `cb(err, changes)` or as a stream
 * @param  {string}   id  Changeset ID
 * @param  {Object}   osm osm-p2p-db instance
 * @param  {Function} cb  callback(err, array of elements from changeset)
 *                        Elements have the property 'action' which is one of
 *                        create|modify|delete
 * @returns {ReadableStream} Readable object stream of changes
 */
module.exports = function (osm) {
  return function getChanges (id, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    var stream = through.obj(getDoc)
    // Check whether doc with id exists
    osm.get(id, function (err, docs) {
      if (err) return onError(err)
      // Ensure that doc with id is of type changset
      if (!isChangeset(docs)) {
        return onError(new errors.NotFound('changeset id: ' + id))
      }
      // An object stream {key: versionId, value: 0}
      var r = osm.changeset.list(id, opts)
      r.on('error', onError)
      r.pipe(stream)
    })
    if (cb) {
      // If a callback is defined, collect the stream into an array
      cb = once(cb)
      collect(stream, cb)
    } else {
      // Otherwise return a readable stream
      return readonly(stream)
    }

    function getDoc (row, enc, next) {
      var self = this
      osm.log.get(row.key, function (err, doc) {
        if (err) return next(err)
        var element = xtend(doc.value.v, {
          id: doc.value.k,
          version: doc.key,
          action: getAction(doc)
        })
        self.push(refs2nodes(element))
        next()
      })
    }

    function onError (err) {
      if (cb) return cb(err)
      stream.emit('error', err)
    }
  }
}

function isChangeset (docs) {
  var versions = Object.keys(docs)
  var result = false
  versions.forEach(function (version) {
    if (docs[version].type === 'changeset') result = true
  })
  return result
}

function getAction (doc) {
  if (doc.links.length === 0 && doc.value.d === undefined) return 'create'
  if (doc.links.length > 0 && doc.value.d === undefined) return 'modify'
  if (doc.value.d !== undefined) return 'delete'
}
