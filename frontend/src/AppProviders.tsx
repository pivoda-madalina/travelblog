import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { theme } from './theme';

interface AppProvidersProps {
  queryClient: QueryClient;
  children: ReactNode;
  /** `test` turns off transitions and portals, so tests see menus and modals straight away. */
  env?: 'default' | 'test';
}

export function AppProviders({ queryClient, children, env = 'default' }: AppProvidersProps) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light" env={env}>
      <Notifications position="bottom-right" />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  );
}
