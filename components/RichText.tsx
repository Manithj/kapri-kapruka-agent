import React from "react";

// Lightweight inline markdown: **bold**, *italic* / _italic_, `code`, and newlines.
// Works fine with Sinhala/Tanglish text since it only keys off markup characters.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`\n]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) nodes.push(<strong key={`${keyBase}-${k}`}>{m[1]}</strong>);
    else if (m[2] !== undefined) nodes.push(<em key={`${keyBase}-${k}`}>{m[2]}</em>);
    else if (m[3] !== undefined) nodes.push(<em key={`${keyBase}-${k}`}>{m[3]}</em>);
    else if (m[4] !== undefined)
      nodes.push(
        <code key={`${keyBase}-${k}`} className="rounded bg-emerald-soft px-1 py-0.5 text-[0.85em]">
          {m[4]}
        </code>
      );
    last = regex.lastIndex;
    k++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderInline(line, `l${i}`)}
          {i < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </>
  );
}
