import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { createQueryClient } from '../api/queryClient';
import { AppProviders } from '../AppProviders';
import { routes } from '../routes';

/** Renders the whole app at `path` with fresh providers, so tests never share cached data. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders queryClient={createQueryClient()} env="test">
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
