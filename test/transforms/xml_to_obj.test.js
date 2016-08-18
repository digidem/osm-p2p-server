var test = require('tape')
var fs = require('fs')
var path = require('path')
var stream = require('stream')

var xml2Obj = require('../../transforms/xml_to_obj')

test('exports instance of stream', t => {
  t.true(xml2Obj() instanceof stream.Stream)
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
  t.plan(5)
  xml2Obj.fn(nodeXml, (e, obj) => {
    t.deepEqual(obj, node)
  })
  xml2Obj.fn(wayXml, (e, obj) => {
    t.deepEqual(obj, way)
  })
  xml2Obj.fn(relationXml, (e, obj) => {
    t.deepEqual(obj, relation)
  })
  xml2Obj.fn(changesetOpenXml, (e, obj) => {
    t.deepEqual(obj, changesetOpen)
  })
  xml2Obj.fn(changesetClosedXml, (e, obj) => {
    t.deepEqual(obj, changesetClosed)
  })
})

test('ignores non-whitelisted props', t => {
  var nodePlus = nodeXml.replace(/^<node/, '<node otherprop="something"')
  var wayPlus = wayXml.replace(/^<way/, '<way otherprop="something"')
  var relationPlus = relationXml.replace(/^<relation/, '<relation otherprop="something"')
  xml2Obj.fn(nodePlus, (e, obj) => {
    t.deepEqual(obj, node)
  })
  xml2Obj.fn(wayPlus, (e, obj) => {
    t.deepEqual(obj, way)
  })
  xml2Obj.fn(relationPlus, (e, obj) => {
    t.deepEqual(obj, relation)
  })
  t.end()
})

test('missing tags, members, nodes', t => {
  t.plan(4)
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
  xml2Obj.fn(nodeNoTagsXml, (e, obj) => {
    t.deepEqual(obj, nodeNoTags, 'No tags in object, no tags in xml')
  })
  xml2Obj.fn(wayNoNodesXml, (e, obj) => {
    t.deepEqual(obj, wayNoNodes, 'No nodes in object, no nodes in xml')
  })
  xml2Obj.fn(wayNoNodesNoTagsXml, (e, obj) => {
    t.deepEqual(obj, wayNoNodesNoTags, 'No nodes or tags in object, no nodes or tags in xml')
  })
  xml2Obj.fn(relationNoMembersXml, (e, obj) => {
    t.deepEqual(obj, relationNoMembers, 'No members in object, no members in xml')
  })
})
