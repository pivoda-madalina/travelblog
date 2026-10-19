import { Anchor, Badge, Button, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router';

import { useCurrentUser } from '../features/auth/api';
import { useTrip } from '../features/trips/api';
import { DeleteTripButton } from '../features/trips/DeleteTripButton';
import { formatDateRange } from '../lib/dates';

/** The trip's title, dates and summary. The cover banner and the route, journal, photos and
 * budget tabs arrive with #10. */
export function TripPage() {
  const { tripId = '' } = useParams();
  const { data: trip, isPending, isError } = useTrip(tripId);
  const { data: user } = useCurrentUser();

  if (isPending) {
    return (
      <Stack>
        <Skeleton height={36} width="50%" />
        <Skeleton height={20} width="25%" />
      </Stack>
    );
  }

  // Visitors get the same page for a draft as for a missing trip (BR-14).
  if (isError) {
    return (
      <>
        <Title order={1}>Trip not found</Title>
        <Text>
          <Anchor component={Link} to="/">
            Back to trips
          </Anchor>
        </Text>
      </>
    );
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap="sm">
          <Title order={1}>{trip.title}</Title>
          {trip.status === 'draft' && <Badge color="orange">Draft</Badge>}
        </Group>
        {/* Not rendered for visitors (docs/ui-design.md, author-only controls). */}
        {user?.is_author && (
          <Group gap="sm">
            <Button component={Link} to={`/trips/${trip.id}/edit`} variant="default">
              Edit
            </Button>
            <DeleteTripButton trip={trip} />
          </Group>
        )}
      </Group>
      <Text c="dimmed">{formatDateRange(trip.start_date, trip.end_date)}</Text>
      {trip.summary && <Text ff="heading">{trip.summary}</Text>}
    </Stack>
  );
}
