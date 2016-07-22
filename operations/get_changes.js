var error = require('debug')('osm-p2p-server:error')
var xtend = require('xtend')

var toOsmObj = require('../transforms/osm_p2p_to_obj.js')

/**
 * Get the changes in a changeset.
 * @param  {string}   id  Changeset ID
 * @param  {Object}   osm osm-p2p-db instance
 * @param  {Function} cb  callback(err, array of elements from changeset)
 *                        Elements have the property 'action' which is on of
 *                        create|modify|delete
 */
module.exports = function getChanges (id, osm, cb) {
  osm.getChanges(id, function (err, versionIds) {
    if (err) return cb(err)
    var docs = []
    var pending = versionIds.length
    var errors = []

    if (!versionIds.length) return cb(null, [])

    versionIds.forEach(function (versionId) {
      osm.log.get(versionId, function (err, doc) {
        if (err) {
          errors.push(err)
          error(err)
        } else docs.push(doc)
        if (--pending === 0) {
          if (errors.length) return cb(new Error(errors.join('\n')))
          cb(null, docs.map(docmap))
        }
      })
    })
  })
}

function docmap (doc) {
  var element = xtend(doc.value.v, {
    id: doc.value.k,
    version: doc.key,
    action: getAction(doc)
  })
  return toOsmObj.fn(element)
}

function getAction (doc) {
  if (doc.links.length === 0 && doc.value.d === undefined) return 'create'
  if (doc.links.length > 0 && doc.value.d === undefined) return 'modify'
  if (doc.value.d !== undefined) return 'delete'
}
