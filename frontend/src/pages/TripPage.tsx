import {
  Anchor,
  BackgroundImage,
  Badge,
  Box,
  Button,
  Group,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router';

import { useCurrentUser } from '../features/auth/api';
import { type Trip, useTrip } from '../features/trips/api';
import { DeleteTripButton } from '../features/trips/DeleteTripButton';
import { formatDateRange } from '../lib/dates';

/** The trip page header and tabs shared by screens 3 to 6. Each tab is a child route. */
export function TripPage() {
  const { tripId = '' } = useParams();
  const { data: trip, isPending, isError } = useTrip(tripId);

  if (isPending) {
    return (
      <Stack>
        <Skeleton height={240} />
        <Skeleton height={20} width="50%" />
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
    <Stack gap="lg">
      <TripBanner trip={trip} />
      {trip.summary && <Text ff="heading">{trip.summary}</Text>}
      <TripTabs tripId={trip.id} />
      <Outlet />
    </Stack>
  );
}

function TripBanner({ trip }: { trip: Trip }) {
  const { data: user } = useCurrentUser();
  const facts = [formatDateRange(trip.start_date, trip.end_date), trip.countries.join(', ')];

  const content = (
    <Group justify="space-between" align="flex-end" h="100%" p="lg">
      <Stack gap={4}>
        <Group gap="sm">
          <Title order={1}>{trip.title}</Title>
          {trip.status === 'draft' && <Badge color="orange">Draft</Badge>}
        </Group>
        <Text>{facts.filter(Boolean).join(' · ')}</Text>
      </Stack>
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
  );

  if (!trip.cover_photo) {
    return (
      <Box bg="gray.1" mih={160} style={{ borderRadius: 'var(--mantine-radius-md)' }}>
        {content}
      </Box>
    );
  }
  return (
    <BackgroundImage src={trip.cover_photo} radius="md" mih={280}>
      {/* A dark gradient keeps the title readable on any photo. */}
      <Box
        c="white"
        mih={280}
        style={{
          borderRadius: 'var(--mantine-radius-md)',
          background: 'linear-gradient(transparent 30%, rgba(0, 0, 0, 0.65))',
        }}
      >
        {content}
      </Box>
    </BackgroundImage>
  );
}

const tabs = [
  { path: 'route', label: 'Route', authorOnly: false },
  { path: 'journal', label: 'Journal', authorOnly: false },
  { path: 'photos', label: 'Photos', authorOnly: false },
  { path: 'budget', label: 'Budget', authorOnly: true },
];

/** The Budget tab is not rendered for visitors (BR-14). */
function TripTabs({ tripId }: { tripId: number }) {
  const { data: user } = useCurrentUser();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const base = `/trips/${tripId}`;
  // The Route tab lives at the trip's own URL.
  const current = pathname.slice(base.length).replace(/^\//, '').replace(/\/$/, '') || 'route';

  return (
    <Tabs
      value={current}
      onChange={(path) => void navigate(path === 'route' ? base : `${base}/${path}`)}
    >
      <Tabs.List>
        {tabs
          .filter(({ authorOnly }) => !authorOnly || user?.is_author)
          .map(({ path, label }) => (
            <Tabs.Tab key={label} value={path}>
              {label}
            </Tabs.Tab>
          ))}
      </Tabs.List>
    </Tabs>
  );
}
