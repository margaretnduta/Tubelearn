import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders AI markdown with TubeLearn's typography. Long words/URLs wrap instead of breaking layout. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="font-display text-lg tracking-tight text-foreground">{children}</h3>,
          h2: ({ children }) => <h3 className="font-display text-base tracking-tight text-foreground">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold text-foreground">{children}</h4>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-foreground">{children}</h4>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--ember)] underline underline-offset-2">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>
          ),
          code: ({ children, className }) =>
            className?.includes("language-") ? (
              <code className="block overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">{children}</code>
            ) : (
              <code className="rounded bg-background px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
            ),
          pre: ({ children }) => <pre className="overflow-x-auto rounded-md border border-border bg-background">{children}</pre>,
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
