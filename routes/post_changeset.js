var addChangeset = require('../handlers/add_changeset')
var body = require('body/any')

function PostChangesetRoute (osmdb) {
  return function postChangesetRoute (req, res, next) {
    body(req, res, function (err, changeset) {
      if (err) return next(err)
      addChangeset(changeset, osmdb, function done (err, keys) {
        if (err) return next(err)
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(keys) + '\n')
      })
    })
  }
}

module.exports = PostChangesetRoute
