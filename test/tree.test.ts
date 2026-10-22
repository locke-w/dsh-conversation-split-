import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assignSession, cycle, isValidLayout, leaf, leaves, movePane, neighbour, place, removePane, type Node,
  setRatio, splitPane, swapPanes, type Layout,
} from '../src/layout/tree.ts'
import { parseLayout, serializeLayout } from '../src/layout/storage.ts'

const box = { left: 0, top: 0, width: 1000, height: 600 }

test('split right then down builds a nested tree', () => {
  let root = splitPane(leaf('a', 's1'), 'a', 'right', leaf('b', 's2'))!
  root = splitPane(root, 'b', 'bottom', leaf('c', 's3'))!
  assert.deepEqual(leaves(root).map((l) => l.id), ['a', 'b', 'c'])
  const { panes, dividers } = place({ root, focus: 'a', zoom: null }, box, 0)
  assert.equal(panes.length, 3)
  assert.equal(dividers.length, 2)
  const a = panes.find((p) => p.pane.id === 'a')!.rect
  const c = panes.find((p) => p.pane.id === 'c')!.rect
  assert.equal(a.width, 500)
  assert.equal(c.top, 300)
  assert.equal(neighbour(panes, 'a', 'right'), 'b')
  assert.equal(neighbour(panes, 'b', 'bottom'), 'c')
  assert.equal(neighbour(panes, 'a', 'left'), undefined)
})

test('split left/top puts the new pane first', () => {
  const root = splitPane(leaf('a'), 'a', 'left', leaf('b'))!
  assert.deepEqual(leaves(root).map((l) => l.id), ['b', 'a'])
})

test('remove collapses to the sibling; last pane returns undefined', () => {
  const root = splitPane(leaf('a'), 'a', 'right', leaf('b'))!
  const after = removePane(root, 'a')!
  assert.equal(after.kind, 'leaf')
  assert.equal(removePane(after, 'b'), undefined)
})

test('zoom shows one pane only', () => {
  const root = splitPane(leaf('a'), 'a', 'right', leaf('b'))!
  const { panes, dividers } = place({ root, focus: 'a', zoom: 'b' }, box)
  assert.equal(panes.length, 1)
  assert.equal(panes[0]!.pane.id, 'b')
  assert.equal(dividers.length, 0)
})

test('ratio is clamped, swap/assign/move keep ids', () => {
  let root = splitPane(leaf('a', 's1'), 'a', 'right', leaf('b', 's2'))!
  root = setRatio(root, [], 0.01)
  assert.equal((root as { ratio: number }).ratio, 0.15)
  root = swapPanes(root, 'a', 'b')
  assert.equal(leaves(root)[0]!.sessionId, 's2')
  root = assignSession(root, 'a', null)
  assert.equal(leaves(root)[0]!.sessionId, null)
  root = splitPane(root, 'b', 'bottom', leaf('c'))!
  const moved = movePane(root, 'c', 'a', 'top')!
  assert.deepEqual(leaves(moved).map((l) => l.id), ['c', 'a', 'b'])
  assert.equal(cycle(moved, 'b', 1), 'c')
  assert.equal(cycle(moved, 'c', -1), 'b')
})

test('pane limit', () => {
  let root: Node = leaf('p0')
  for (let i = 1; i < 8; i++) root = splitPane(root, `p${i - 1}`, 'right', leaf(`p${i}`))!
  assert.equal(splitPane(root, 'p7', 'right', leaf('p8')), undefined)
})

test('storage round-trips and rejects junk', () => {
  const layout: Layout = { root: splitPane(leaf('a', 's1'), 'a', 'right', leaf('b'))!, focus: 'b', zoom: null }
  assert.deepEqual(parseLayout(serializeLayout(layout)), layout)
  assert.equal(parseLayout('{"root":{"kind":"leaf","id":"a","sessionId":null},"focus":"zz","zoom":null}'), null)
  assert.equal(parseLayout('nope'), null)
  assert.equal(isValidLayout({ root: { kind: 'split', axis: 'row', ratio: 2, first: leaf('a'), second: leaf('b') }, focus: 'a', zoom: null }), false)
})
