import type { RouteObject } from 'react-router';

import { Layout } from './components/Layout';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignInPage } from './pages/SignInPage';
import { TripListPage } from './pages/TripListPage';
import { TripPage } from './pages/TripPage';
import { WorldMapPage } from './pages/WorldMapPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <TripListPage /> },
      { path: 'trips/:tripId', element: <TripPage /> },
      { path: 'map', element: <WorldMapPage /> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
