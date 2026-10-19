import { SimpleGrid, Skeleton, Text } from '@mantine/core';
import { Navigate, useParams } from 'react-router';

import { useCurrentUser } from '../auth/api';
import { useTrip } from '../trips/api';
import { PlannedBudgetCard } from './PlannedBudgetCard';

/** Screen 6, for the author only. Visitors who open the URL are returned to the Route tab, and
 * the API hides the budget from them anyway (BR-14). */
export function BudgetTab() {
  const { tripId = '' } = useParams();
  const { data: user, isPending } = useCurrentUser();
  // The trip page has loaded the trip already, so this reads it from the cache.
  const { data: trip } = useTrip(tripId);

  if (isPending) {
    return null;
  }
  if (!user?.is_author) {
    return <Navigate to=".." relative="path" replace />;
  }
  if (!trip) {
    return <Skeleton height={96} />;
  }
  return (
    <SimpleGrid cols={3}>
      <PlannedBudgetCard trip={trip} />
      {/* Spent, difference, categories and expenses arrive with US-11 to US-13. */}
      <Text c="gray">Expenses are coming soon (US-11).</Text>
    </SimpleGrid>
  );
}
