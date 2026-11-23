import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/contrib/mhchem';
import { AlertTriangle } from 'lucide-react';

export interface RichTextProps {
  /** The text content with math formulas ($...$, $$...$$, \ce{...}) */
  content?: string;
  /** Children can be passed as string instead of content prop */
  children?: React.ReactNode;
  /** Custom wrapper class name */
  className?: string;
  /** HTML tag for the wrapper */
  as?: React.ElementType;
}

type Token =
  | { type: 'text'; content: string }
  | { type: 'inline-math'; content: string; raw: string }
  | { type: 'display-math'; content: string; raw: string }
  | { type: 'chem'; content: string; raw: string };

/**
 * Parses mixed text containing:
 * - Display math: $$...$$ or \[...\]
 * - Inline math: $...$ or \(...\)
 * - Chemistry formulas: \ce{...}
 */
export function tokenizeMath(input: string): Token[] {
  if (!input) return [];

  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;
  let textBuffer = '';

  const flushText = () => {
    if (textBuffer.length > 0) {
      tokens.push({ type: 'text', content: textBuffer });
      textBuffer = '';
    }
  };

  while (i < len) {
    // 1. Escaped dollar: \$ -> literal $
    if (input[i] === '\\' && i + 1 < len && input[i + 1] === '$') {
      textBuffer += '$';
      i += 2;
      continue;
    }

    // 2. Display math: $$...$$
    if (input[i] === '$' && i + 1 < len && input[i + 1] === '$') {
      const closingIndex = input.indexOf('$$', i + 2);
      if (closingIndex !== -1) {
        flushText();
        const raw = input.substring(i, closingIndex + 2);
        const math = input.substring(i + 2, closingIndex);
        tokens.push({ type: 'display-math', content: math.trim(), raw });
        i = closingIndex + 2;
        continue;
      }
    }

    // 2b. LaTeX display math: \[...\]
    if (input[i] === '\\' && i + 1 < len && input[i + 1] === '[') {
      const closingIndex = input.indexOf('\\]', i + 2);
      if (closingIndex !== -1) {
        flushText();
        const raw = input.substring(i, closingIndex + 2);
        const math = input.substring(i + 2, closingIndex);
        tokens.push({ type: 'display-math', content: math.trim(), raw });
        i = closingIndex + 2;
        continue;
      }
    }

    // 3. LaTeX inline math: \(...\)
    if (input[i] === '\\' && i + 1 < len && input[i + 1] === '(') {
      const closingIndex = input.indexOf('\\)', i + 2);
      if (closingIndex !== -1) {
        flushText();
        const raw = input.substring(i, closingIndex + 2);
        const math = input.substring(i + 2, closingIndex);
        tokens.push({ type: 'inline-math', content: math.trim(), raw });
        i = closingIndex + 2;
        continue;
      }
    }

    // 4. Inline math: $...$
    if (input[i] === '$') {
      let closingIndex = -1;
      for (let j = i + 1; j < len; j++) {
        if (input[j] === '$' && input[j - 1] !== '\\') {
          closingIndex = j;
          break;
        }
      }
      if (closingIndex !== -1) {
        flushText();
        const raw = input.substring(i, closingIndex + 1);
        const math = input.substring(i + 1, closingIndex);
        tokens.push({ type: 'inline-math', content: math.trim(), raw });
        i = closingIndex + 1;
        continue;
      }
    }

    // 5. Standalone mhchem: \ce{...}
    if (input.startsWith('\\ce{', i)) {
      let depth = 0;
      let closingIndex = -1;
      for (let j = i + 3; j < len; j++) {
        if (input[j] === '{') {
          depth++;
        } else if (input[j] === '}') {
          depth--;
          if (depth === 0) {
            closingIndex = j;
            break;
          }
        }
      }
      if (closingIndex !== -1) {
        flushText();
        const raw = input.substring(i, closingIndex + 1);
        tokens.push({ type: 'chem', content: raw, raw });
        i = closingIndex + 1;
        continue;
      }
    }

    // Regular character
    textBuffer += input[i];
    i++;
  }

  flushText();
  return tokens;
}

interface RenderFormulaProps {
  content: string;
  raw: string;
  displayMode: boolean;
}

const RenderFormula: React.FC<RenderFormulaProps> = ({ content, raw, displayMode }) => {
  const rendered = useMemo(() => {
    try {
      const html = katex.renderToString(content, {
        displayMode,
        throwOnError: true,
        strict: false,
      });
      return { html, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { html: null, error: message };
    }
  }, [content, displayMode]);

  if (rendered.error) {
    return (
      <span
        data-testid="math-error"
        title={rendered.error}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded text-xs font-mono text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800 align-middle"
      >
        <AlertTriangle
          className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0"
          aria-label="Cảnh báo cú pháp công thức"
        />
        <span>{raw}</span>
      </span>
    );
  }

  if (displayMode) {
    return (
      <span
        data-testid="display-math"
        className="block my-2 text-center overflow-x-auto py-1"
        dangerouslySetInnerHTML={{ __html: rendered.html! }}
      />
    );
  }

  return (
    <span
      data-testid="inline-math"
      className="inline-block align-middle mx-0.5"
      dangerouslySetInnerHTML={{ __html: rendered.html! }}
    />
  );
};

export const RichText: React.FC<RichTextProps> = React.memo(
  ({ content, children, className = '', as: Component = 'span' }) => {
    // Resolve string content from prop or children
    const rawContent = useMemo(() => {
      if (typeof content === 'string') return content;
      if (typeof children === 'string') return children;
      if (Array.isArray(children)) {
        return children
          .map((child) => (typeof child === 'string' ? child : ''))
          .join('');
      }
      return '';
    }, [content, children]);

    const tokens = useMemo(() => tokenizeMath(rawContent), [rawContent]);

    if (!rawContent) {
      return null;
    }

    return (
      <Component className={className}>
        {tokens.map((token, index) => {
          switch (token.type) {
            case 'text':
              return <React.Fragment key={index}>{token.content}</React.Fragment>;
            case 'display-math':
              return (
                <RenderFormula
                  key={index}
                  content={token.content}
                  raw={token.raw}
                  displayMode={true}
                />
              );
            case 'inline-math':
              return (
                <RenderFormula
                  key={index}
                  content={token.content}
                  raw={token.raw}
                  displayMode={false}
                />
              );
            case 'chem':
              return (
                <RenderFormula
                  key={index}
                  content={token.content}
                  raw={token.raw}
                  displayMode={false}
                />
              );
            default:
              return null;
          }
        })}
      </Component>
    );
  }
);

RichText.displayName = 'RichText';
export default RichText;
