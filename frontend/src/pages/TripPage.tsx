import { Text, Title } from '@mantine/core';
import { useParams } from 'react-router';

export function TripPage() {
  const { tripId } = useParams();

  return (
    <>
      <Title order={1}>Trip {tripId}</Title>
      <Text c="dimmed">The route, journal, photos and budget tabs will appear here.</Text>
    </>
  );
}
