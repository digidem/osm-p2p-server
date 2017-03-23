var test = require('tape')

var replacePlaceholderIds = require('../../lib/replace_ids')

// TODO: Tests for relations

test('replacePlaceholderIds', t => {
  var input = [
    {action: 'create', type: 'node', id: 'A'},
    {action: 'create', type: 'way', id: 'B', nodes: ['A']},
    {action: 'modify', type: 'way', id: 'C', nodes: ['A', 'X']}
  ]
  replacePlaceholderIds(input, function (err, result) {
    t.error(err)
    t.notEqual(result[0].id, input[0].id, 'id replaced')
    t.equal(result[0].old_id, input[0].id, 'old_id prop is placeholder id')
    t.notEqual(result[1].id, input[1].id, 'id replaced')
    t.equal(result[1].old_id, input[1].id, 'old_id prop is placeholder id')
    t.equal(result[1].nodes[0], result[0].id, 'created way ref updated')
    t.deepEqual(result[2].nodes, [result[0].id, 'X'], 'modified node ref updated')
    t.equal(result[2].old_id, undefined, 'old_id not set on modified way')
    t.end()
  })
})

test('replacePlaceholderIds: duplicate node ids', t => {
  var input = [
    {action: 'create', type: 'node', id: '-123'},
    {action: 'create', type: 'node', id: '-123'}
  ]
  replacePlaceholderIds(input, function (err) {
    t.true(err instanceof Error, 'returns error')
    t.true(/#-123/.test(err.message), 'error references dup id')
    t.end()
  })
})

test('replacePlaceholderIds: duplicate way ids', t => {
  var input = [
    {action: 'create', type: 'way', id: '-123'},
    {action: 'create', type: 'way', id: '-123'}
  ]
  replacePlaceholderIds(input, function (err) {
    t.true(err instanceof Error, 'returns error')
    t.true(/#-123/.test(err.message), 'error references dup id')
    t.end()
  })
})

test('replacePlaceholderIds: duplicate relation ids', t => {
  var input = [
    {action: 'create', type: 'relation', id: '-123'},
    {action: 'create', type: 'relation', id: '-123'}
  ]
  replacePlaceholderIds(input, function (err) {
    t.true(err instanceof Error, 'returns error')
    t.true(/#-123/.test(err.message), 'error references dup id')
    t.end()
  })
})

test('replacePlaceholderIds: placeholder ids can be duplicated between types', t => {
  var input = [
    {action: 'create', type: 'node', id: 'A'},
    {action: 'create', type: 'way', id: 'A', nodes: ['A']},
    {action: 'modify', type: 'way', id: 'B', nodes: ['A', 'X']}
  ]
  replacePlaceholderIds(input, function (err, result) {
    t.error(err)
    t.notEqual(result[0].id, input[0].id, 'id replaced')
    t.equal(result[0].old_id, input[0].id, 'old_id prop is placeholder id')
    t.notEqual(result[1].id, input[1].id, 'id replaced')
    t.equal(result[1].old_id, input[1].id, 'old_id prop is placeholder id')
    t.equal(result[1].nodes[0], result[0].id, 'created way ref updated')
    t.deepEqual(result[2].nodes, [result[0].id, 'X'], 'modified node ref updated')
    t.equal(result[2].old_id, undefined, 'old_id not set on modified way')
    t.end()
  })
})

test('replacePlaceholderIds: input order', t => {
  var input = [
    {action: 'create', type: 'way', id: 'A', nodes: ['A', 'B']},
    {action: 'modify', type: 'way', id: 'B', nodes: ['A', 'X']},
    {action: 'create', type: 'node', id: 'A'},
    {action: 'create', type: 'node', id: 'B'}
  ]
  replacePlaceholderIds(input, function (err, result) {
    t.error(err)
    var nodeA = result[2]
    var nodeB = result[3]
    t.notEqual(nodeA.id, input[2].id, 'id replaced')
    t.notEqual(nodeB.id, input[3].id, 'id replaced')
    // Ids should be replaced for way nodes.
    var wayA = result[0]
    var wayB = result[1]
    t.notEqual(wayA.nodes[0], 'A', 'way node id replaced')
    t.notEqual(wayA.nodes[1], 'B', 'way node id replaced')
    t.notEqual(wayB.nodes[0], 'A', 'way node id replaced')
    t.equal(wayB.nodes[1], 'X', 'way node id replaced')
    t.end()
  })
})
