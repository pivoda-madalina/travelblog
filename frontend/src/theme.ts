import { createTheme } from '@mantine/core';

// Colours and fonts from docs/ui-design.md. Components use these tokens, never hard-coded values.
export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: { fontFamily: 'Lora, Georgia, serif' },
  defaultRadius: 'md',
});
