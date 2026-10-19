import type { RouteObject } from 'react-router';

import { Layout } from './components/Layout';
import { EditTripPage } from './pages/EditTripPage';
import { NewTripPage } from './pages/NewTripPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignInPage } from './pages/SignInPage';
import { TripListPage } from './pages/TripListPage';
import { TripPage } from './pages/TripPage';
import { BudgetTab, JournalTab, PhotosTab, RouteTab } from './pages/TripTabPages';
import { WorldMapPage } from './pages/WorldMapPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <TripListPage /> },
      { path: 'trips/new', element: <NewTripPage /> },
      {
        path: 'trips/:tripId',
        element: <TripPage />,
        children: [
          { index: true, element: <RouteTab /> },
          { path: 'journal', element: <JournalTab /> },
          { path: 'photos', element: <PhotosTab /> },
          { path: 'budget', element: <BudgetTab /> },
        ],
      },
      { path: 'trips/:tripId/edit', element: <EditTripPage /> },
      { path: 'map', element: <WorldMapPage /> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
