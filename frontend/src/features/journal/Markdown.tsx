import { Typography } from '@mantine/core';
import ReactMarkdown from 'react-markdown';

/** Journal text in the reading font. Raw HTML in the Markdown is dropped, not rendered
 * (architecture, Stack). */
export function Markdown({ children }: { children: string }) {
  return (
    <Typography style={{ fontFamily: 'var(--mantine-font-family-headings)' }}>
      <ReactMarkdown skipHtml>{children}</ReactMarkdown>
    </Typography>
  );
}
