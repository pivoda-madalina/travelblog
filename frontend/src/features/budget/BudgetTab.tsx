import { SimpleGrid, Skeleton, Stack } from '@mantine/core';
import { Navigate, useParams } from 'react-router';

import { useCurrentUser } from '../auth/api';
import { useTrip } from '../trips/api';
import { ExpenseTable } from './ExpenseTable';
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
    <Stack gap="xl">
      <SimpleGrid cols={3}>
        <PlannedBudgetCard trip={trip} />
        {/* Spent, difference and categories arrive with US-13. */}
      </SimpleGrid>
      <ExpenseTable trip={trip} />
    </Stack>
  );
}
