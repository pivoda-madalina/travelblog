import { Grid, Skeleton, Text } from '@mantine/core';
import { useState } from 'react';
import { useParams } from 'react-router';

import { useCurrentUser } from '../auth/api';
import { useTrip } from '../trips/api';
import { type Point, usePlaces } from './api';
import { AddPlaceModal } from './AddPlaceModal';
import { PlaceList } from './PlaceList';
import { TripMap } from './TripMap';

/** Wireframe 3: the map on two thirds of the width and the route beside it. */
export function RouteTab() {
  const { tripId = '' } = useParams();
  // The trip page has loaded the trip already, so this reads it from the cache.
  const { data: trip } = useTrip(tripId);
  const { data: user } = useCurrentUser();
  const places = usePlaces(Number(tripId));
  const [clicked, setClicked] = useState<Point | null>(null);

  if (!trip || places.isPending) {
    return <Skeleton height={480} />;
  }
  if (places.isError) {
    return <Text c="gray">Something went wrong. Try again.</Text>;
  }

  const isAuthor = user?.is_author ?? false;
  return (
    <Grid gap="lg">
      <Grid.Col span={8}>
        <TripMap
          places={places.data}
          pending={clicked}
          onMapClick={isAuthor ? setClicked : undefined}
        />
      </Grid.Col>
      <Grid.Col span={4}>
        <PlaceList tripId={trip.id} places={places.data} isAuthor={isAuthor} />
      </Grid.Col>
      {isAuthor && <AddPlaceModal trip={trip} point={clicked} onClose={() => setClicked(null)} />}
    </Grid>
  );
}
