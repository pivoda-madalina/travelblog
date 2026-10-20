import { Typography } from '@mantine/core';
import ReactMarkdown, { type Components } from 'react-markdown';

// The entry title is an h4 under the day's h3, so headings in the text come below it: # and ##
// as h5, the rest as h6.
const headings: Components = { h1: 'h5', h2: 'h5', h3: 'h6', h4: 'h6', h5: 'h6' };

/** Journal text in the reading font. Raw HTML in the Markdown is dropped, not rendered
 * (architecture, Stack). */
export function Markdown({ children }: { children: string }) {
  return (
    <Typography style={{ fontFamily: 'var(--mantine-font-family-headings)' }}>
      <ReactMarkdown skipHtml components={headings}>
        {children}
      </ReactMarkdown>
    </Typography>
  );
}
