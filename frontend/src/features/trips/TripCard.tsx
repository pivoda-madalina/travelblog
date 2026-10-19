import { Badge, Box, Card, Image, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

import { formatDateRange } from '../../lib/dates';
import type { Trip } from './api';

const COVER_HEIGHT = 180;

/** One card on the trip list; the whole card links to the trip page (US-03). */
export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Card component={Link} to={`/trips/${trip.id}`} withBorder padding="md">
      <Card.Section pos="relative">
        {trip.cover_photo ? (
          <Image src={trip.cover_photo} alt="" h={COVER_HEIGHT} />
        ) : (
          <Box h={COVER_HEIGHT} bg="gray.1" />
        )}
        {trip.status === 'draft' && (
          <Badge color="orange" pos="absolute" top={12} left={12}>
            Draft
          </Badge>
        )}
      </Card.Section>
      <Stack gap={4} mt="md">
        <Title order={3}>{trip.title}</Title>
        <Text c="dimmed">{formatDateRange(trip.start_date, trip.end_date)}</Text>
        {trip.countries.length > 0 && <Text>{trip.countries.join(', ')}</Text>}
      </Stack>
    </Card>
  );
}
