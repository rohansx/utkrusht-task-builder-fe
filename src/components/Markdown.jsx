import { mdBlocks } from '../markdown.js'

function Inline({ tokens }) {
  return tokens.map((tk, i) =>
    tk.t === 'b' ? (
      <strong key={i}>{tk.v}</strong>
    ) : tk.t === 'code' ? (
      <code key={i}>{tk.v}</code>
    ) : (
      <span key={i}>{tk.v}</span>
    )
  )
}

// Render the bot's message markdown (paragraphs, bullet lists, bold, code).
export default function Markdown({ text }) {
  return mdBlocks(text).map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i}>
        {b.items.map((it, j) => (
          <li key={j}>
            <Inline tokens={it} />
          </li>
        ))}
      </ul>
    ) : (
      <p key={i}>
        {b.lines.map((ln, j) => (
          <span key={j}>
            <Inline tokens={ln} />
            {j < b.lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    )
  )
}
