import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useCurrentUser } from './api';

/** Author-only screens send visitors to the sign-in screen, which brings them back after. The API
 * refuses visitors anyway (BR-14); this only spares them a form they cannot save. */
export function RequireAuthor({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return null;
  }
  if (!user?.is_author) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }
  return children;
}
