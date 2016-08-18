var test = require('tape')
var fs = require('fs')
var path = require('path')
var stream = require('stream')

var obj2Xml = require('../../transforms/obj_to_xml')

test('exports instance of stream', t => {
  t.true(obj2Xml() instanceof stream.Stream)
  t.end()
})

var node = require('../fixtures/node.json')
var nodeXml = fs.readFileSync(path.join(__dirname, '../fixtures/node.xml'), 'utf8').replace(/\n+$/, '')
var way = require('../fixtures/way.json')
var wayXml = fs.readFileSync(path.join(__dirname, '../fixtures/way.xml'), 'utf8').replace(/\n+$/, '')
var relation = require('../fixtures/relation.json')
var relationXml = fs.readFileSync(path.join(__dirname, '../fixtures/relation.xml'), 'utf8').replace(/\n+$/, '')
var changesetOpen = require('../fixtures/changeset_open.json')
var changesetOpenXml = fs.readFileSync(path.join(__dirname, '../fixtures/changeset_open.xml'), 'utf8').replace(/\n+$/, '')
var changesetClosed = require('../fixtures/changeset_closed.json')
var changesetClosedXml = fs.readFileSync(path.join(__dirname, '../fixtures/changeset_closed.xml'), 'utf8').replace(/\n+$/, '')

test('map function', t => {
  t.equal(obj2Xml.fn(node), nodeXml)
  t.equal(obj2Xml.fn(way), wayXml)
  t.equal(obj2Xml.fn(relation), relationXml)
  t.equal(obj2Xml.fn(changesetOpen), changesetOpenXml)
  t.equal(obj2Xml.fn(changesetClosed), changesetClosedXml)
  t.end()
})

test('ignores non-whitelisted props', t => {
  var nodePlus = Object.assign({}, node, {otherprop: 'something'})
  var wayPlus = Object.assign({}, way, {otherprop: 'something'})
  var relationPlus = Object.assign({}, relation, {otherprop: 'something'})
  t.equal(obj2Xml.fn(nodePlus), nodeXml)
  t.equal(obj2Xml.fn(wayPlus), wayXml)
  t.equal(obj2Xml.fn(relationPlus), relationXml)
  t.end()
})

test('missing tags, members, nodes', t => {
  var nodeNoTags = Object.assign({}, node)
  delete nodeNoTags.tags
  var nodeNoTagsXml = fs.readFileSync(path.join(__dirname, '../fixtures/node_notags.xml'), 'utf8').replace(/\n+$/, '')
  var wayNoNodes = Object.assign({}, way)
  delete wayNoNodes.nodes
  var wayNoNodesXml = fs.readFileSync(path.join(__dirname, '../fixtures/way_nond.xml'), 'utf8').replace(/\n+$/, '')
  var wayNoNodesNoTags = Object.assign({}, way)
  delete wayNoNodesNoTags.nodes
  delete wayNoNodesNoTags.tags
  var wayNoNodesNoTagsXml = fs.readFileSync(path.join(__dirname, '../fixtures/way_nond_notags.xml'), 'utf8').replace(/\n+$/, '')
  var relationNoMembers = Object.assign({}, relation)
  delete relationNoMembers.members
  var relationNoMembersXml = fs.readFileSync(path.join(__dirname, '../fixtures/relation_nomembers.xml'), 'utf8').replace(/\n+$/, '')
  t.equal(obj2Xml.fn(nodeNoTags), nodeNoTagsXml, 'No tags in object, no tags in xml')
  t.equal(obj2Xml.fn(wayNoNodes), wayNoNodesXml, 'No nodes in object, no nodes in xml')
  t.equal(obj2Xml.fn(wayNoNodesNoTags), wayNoNodesNoTagsXml, 'No nodes or tags in object, no nodes or tags in xml')
  t.equal(obj2Xml.fn(relationNoMembers), relationNoMembersXml, 'No members in object, no members in xml')
  t.end()
})
