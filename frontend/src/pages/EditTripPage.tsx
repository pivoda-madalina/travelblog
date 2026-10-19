import { Divider, Group, Skeleton, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router';

import { RequireAuthor } from '../features/auth/RequireAuthor';
import { type Trip, useTrip, useUpdateTrip } from '../features/trips/api';
import { DeleteTripButton } from '../features/trips/DeleteTripButton';
import { TripForm } from '../features/trips/TripForm';
import { NotFoundPage } from './NotFoundPage';

export function EditTripPage() {
  const { tripId = '' } = useParams();
  const { data: trip, isPending, isError } = useTrip(tripId);

  return (
    <RequireAuthor>
      {isPending ? (
        <Skeleton height={300} maw={720} />
      ) : isError ? (
        <NotFoundPage />
      ) : (
        <EditTrip trip={trip} />
      )}
    </RequireAuthor>
  );
}

function EditTrip({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const updateTrip = useUpdateTrip(trip.id);

  return (
    <>
      <Title order={1} mb="lg">
        Edit trip
      </Title>
      <TripForm
        trip={trip}
        submitting={updateTrip.isPending}
        onSubmit={async (input) => {
          await updateTrip.mutateAsync(input);
          notifications.show({ color: 'green', message: 'Trip saved.' });
          void navigate(`/trips/${trip.id}`);
        }}
        onCancel={() => void navigate(`/trips/${trip.id}`)}
        onUnexpectedError={() =>
          notifications.show({ color: 'red', message: 'Something went wrong. Try again.' })
        }
      />
      <Divider my="xl" maw={720} />
      <Group justify="space-between" maw={720}>
        <Text fw={500}>Danger zone</Text>
        <DeleteTripButton trip={trip} />
      </Group>
    </>
  );
}
