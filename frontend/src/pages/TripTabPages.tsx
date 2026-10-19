import { Text } from '@mantine/core';
import { Navigate } from 'react-router';

import { useCurrentUser } from '../features/auth/api';

/** Placeholders for the trip page tabs until their stories land. */
function ComingSoon({ story }: { story: string }) {
  return <Text c="gray">Coming soon ({story}).</Text>;
}

export function RouteTab() {
  return <ComingSoon story="US-06" />;
}

export function JournalTab() {
  return <ComingSoon story="US-07" />;
}

export function PhotosTab() {
  return <ComingSoon story="US-08" />;
}

/** Visitors who open the budget URL are returned to the Route tab (BR-14). */
export function BudgetTab() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) {
    return null;
  }
  if (!user?.is_author) {
    return <Navigate to=".." relative="path" replace />;
  }
  return <ComingSoon story="US-10" />;
}
