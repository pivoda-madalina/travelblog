import { Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router';

import { RequireAuthor } from '../features/auth/RequireAuthor';
import { useCreateTrip } from '../features/trips/api';
import { TripForm } from '../features/trips/TripForm';

export function NewTripPage() {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();

  return (
    <RequireAuthor>
      <Title order={1} mb="lg">
        New trip
      </Title>
      <TripForm
        submitting={createTrip.isPending}
        onSubmit={async (input) => {
          const trip = await createTrip.mutateAsync(input);
          notifications.show({ color: 'green', message: 'Trip saved.' });
          void navigate(`/trips/${trip.id}`);
        }}
        onCancel={() => void navigate('/')}
        onUnexpectedError={() =>
          notifications.show({ color: 'red', message: 'Something went wrong. Try again.' })
        }
      />
    </RequireAuthor>
  );
}
