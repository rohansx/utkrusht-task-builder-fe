// Runnable check: `node src/markdown.test.mjs`
import assert from 'node:assert'
import { inlineTokens, mdBlocks } from './markdown.js'

// inline: text + bold + code
assert.deepEqual(inlineTokens('a **b** `c`'), [
  { t: 'text', v: 'a ' },
  { t: 'b', v: 'b' },
  { t: 'text', v: ' ' },
  { t: 'code', v: 'c' },
])

// blocks: paragraph, bullet list (with bold), paragraph
const b = mdBlocks("Did you mean one of these?\n\n- **ReactJs**\n- React Native\n\nWhich one?")
assert.equal(b.length, 3)
assert.equal(b[0].type, 'p')
assert.equal(b[1].type, 'ul')
assert.equal(b[1].items.length, 2)
assert.deepEqual(b[1].items[0], [{ t: 'b', v: 'ReactJs' }])
assert.deepEqual(b[1].items[1], [{ t: 'text', v: 'React Native' }])
assert.equal(b[2].type, 'p')

// plain text with no markdown → one paragraph, one text token
assert.deepEqual(mdBlocks('hello there'), [{ type: 'p', lines: [[{ t: 'text', v: 'hello there' }]] }])

console.log('markdown.test: OK')
