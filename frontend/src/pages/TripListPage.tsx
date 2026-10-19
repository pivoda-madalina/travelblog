import { Button, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import { useCurrentUser } from '../features/auth/api';
import { useTrips } from '../features/trips/api';
import { TripCard } from '../features/trips/TripCard';

/** Wireframe 1: newest first, three cards per row. Drafts only reach the author (BR-14). */
export function TripListPage() {
  const { data: trips, isPending, isError } = useTrips();
  const { data: user } = useCurrentUser();

  return (
    <>
      <Title order={1} mb="lg">
        Trips
      </Title>
      {isPending ? (
        <SimpleGrid cols={3}>
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} height={280} />
          ))}
        </SimpleGrid>
      ) : isError ? (
        <Text c="gray">Something went wrong. Try again.</Text>
      ) : trips.length === 0 ? (
        <Stack align="flex-start">
          <Text c="gray">No trips yet.</Text>
          {user?.is_author && (
            <Button component={Link} to="/trips/new">
              Create your first trip
            </Button>
          )}
        </Stack>
      ) : (
        <SimpleGrid cols={3}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
