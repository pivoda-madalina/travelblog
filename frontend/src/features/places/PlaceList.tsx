import { ActionIcon, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

import { formatDate } from '../../lib/dates';
import { type Place, useDeletePlace, useReorderPlaces } from './api';

interface PlaceListProps {
  tripId: number;
  places: Place[];
  isAuthor: boolean;
}

const showError = () =>
  notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });

/** The route beside the map. The author can move places and delete them (US-04). */
export function PlaceList({ tripId, places, isAuthor }: PlaceListProps) {
  const reorder = useReorderPlaces(tripId);
  const [deleting, setDeleting] = useState<Place | null>(null);

  /** Swaps a place with its neighbour; `offset` is -1 for up and 1 for down. */
  function move(index: number, offset: number) {
    const first = places[index];
    const second = places[index + offset];
    if (!first || !second) {
      return;
    }
    const ids = places.map((place) =>
      place === first ? second.id : place === second ? first.id : place.id,
    );
    reorder.mutate(ids, { onError: showError });
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Route</Title>
      {places.length === 0 && <Text c="gray">No places yet.</Text>}
      {places.map((place, index) => (
        <Group key={place.id} justify="space-between" wrap="nowrap" align="flex-start">
          <div>
            <Text fw={500}>
              {index + 1} {place.city.name}, {place.city.country_name}
            </Text>
            <Text size="sm" c="dimmed">
              {formatDate(place.visited_on)}
            </Text>
          </div>
          {isAuthor && (
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="default"
                aria-label={`Move ${place.city.name} up`}
                disabled={index === 0 || reorder.isPending}
                onClick={() => move(index, -1)}
              >
                ↑
              </ActionIcon>
              <ActionIcon
                variant="default"
                aria-label={`Move ${place.city.name} down`}
                disabled={index === places.length - 1 || reorder.isPending}
                onClick={() => move(index, 1)}
              >
                ↓
              </ActionIcon>
              <ActionIcon
                variant="default"
                color="red"
                aria-label={`Delete ${place.city.name}`}
                onClick={() => setDeleting(place)}
              >
                ✕
              </ActionIcon>
            </Group>
          )}
        </Group>
      ))}
      {isAuthor && (
        <Text size="sm" c="dimmed">
          Click the map to add a place.
        </Text>
      )}
      <DeletePlaceModal tripId={tripId} place={deleting} onClose={() => setDeleting(null)} />
    </Stack>
  );
}

function DeletePlaceModal({
  tripId,
  place,
  onClose,
}: {
  tripId: number;
  place: Place | null;
  onClose: () => void;
}) {
  const deletePlace = useDeletePlace(tripId);

  function confirm(placeId: number) {
    deletePlace.mutate(placeId, {
      onSuccess: () => notifications.show({ color: 'green', message: 'Place deleted.' }),
      onError: showError,
      onSettled: onClose,
    });
  }

  return (
    <Modal opened={place !== null} onClose={onClose} title="Delete place" centered>
      {place && (
        <>
          <Text>Delete {place.city.name} from the route?</Text>
          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button color="red" loading={deletePlace.isPending} onClick={() => confirm(place.id)}>
              Delete
            </Button>
          </Group>
        </>
      )}
    </Modal>
  );
}
