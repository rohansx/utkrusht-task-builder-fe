// Minimal markdown for chat bubbles — the only subset the bot emits:
// paragraphs, bullet lists, **bold**, and `inline code`.
// ponytail: subset parser, not a full one. Swap in react-markdown only if the
// bot ever produces headings/tables/nested lists/links.

// Split a line into text / bold / code inline tokens.
export function inlineTokens(s) {
  const out = []
  // Code spans first, so any ** inside code stays literal.
  String(s).split('`').forEach((seg, i) => {
    if (i % 2 === 1) {
      out.push({ t: 'code', v: seg })
      return
    }
    seg.split(/\*\*([^*]+?)\*\*/g).forEach((part, j) => {
      if (part === '') return
      out.push({ t: j % 2 === 1 ? 'b' : 'text', v: part })
    })
  })
  return out
}

// Parse text into block descriptors: {type:'p', lines:[tokens...]} and
// {type:'ul', items:[tokens...]}.
export function mdBlocks(text) {
  const blocks = []
  let para = []
  let list = []
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', lines: para.map(inlineTokens) })
      para = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list.map(inlineTokens) })
      list = []
    }
  }
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*[-*]\s+(.*)$/)
    if (m) {
      flushPara()
      list.push(m[1])
    } else if (line.trim() === '') {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return blocks
}
