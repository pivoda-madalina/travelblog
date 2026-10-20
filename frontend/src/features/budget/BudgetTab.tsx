import { SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { Navigate, useParams } from 'react-router';

import { useCurrentUser } from '../auth/api';
import { type Trip, useTrip } from '../trips/api';
import { useBudget } from './api';
import { CategoryTotals, DifferenceCard, SpentCard } from './BudgetSummary';
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
      <Summary trip={trip} />
      <ExpenseTable trip={trip} />
    </Stack>
  );
}

/** The cards and the category bars (US-10, US-13). */
function Summary({ trip }: { trip: Trip }) {
  const { data: summary, isPending, isError } = useBudget(trip.id);

  return (
    <>
      <SimpleGrid cols={3}>
        <PlannedBudgetCard trip={trip} />
        {isPending ? (
          <>
            <Skeleton height={72} />
            <Skeleton height={72} />
          </>
        ) : isError ? (
          <Text c="red">Something went wrong. Try again.</Text>
        ) : (
          <>
            <SpentCard summary={summary} />
            <DifferenceCard summary={summary} />
          </>
        )}
      </SimpleGrid>
      {summary && <CategoryTotals summary={summary} />}
    </>
  );
}
