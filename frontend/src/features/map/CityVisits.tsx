import { Anchor, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';

import { formatDate } from '../../lib/dates';
import type { MapCity } from './api';

/** The popup of a city's pin: every trip that visited it, newest first, with links (US-05). */
export function CityVisits({ city }: { city: MapCity }) {
  return (
    <Stack gap={6}>
      <Text fw={600}>
        {city.name}, {city.country_name}
      </Text>
      {city.visits.map((visit) => (
        <div key={visit.trip}>
          <Anchor component={Link} to={`/trips/${visit.trip}`} size="sm">
            {visit.title}
          </Anchor>
          <Text size="xs" c="dimmed">
            {formatDate(visit.visited_on)}
          </Text>
        </div>
      ))}
    </Stack>
  );
}
