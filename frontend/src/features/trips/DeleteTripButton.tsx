import { Button, Group, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router';

import { type Trip, useDeleteTrip } from './api';

/** Delete asks for confirmation first, then returns to the trip list (US-02, BR-11). */
export function DeleteTripButton({ trip }: { trip: Trip }) {
  const [opened, { open, close }] = useDisclosure(false);
  const deleteTrip = useDeleteTrip();
  const navigate = useNavigate();

  function confirm() {
    deleteTrip.mutate(trip.id, {
      onSuccess: () => {
        notifications.show({ color: 'green', message: 'Trip deleted.' });
        void navigate('/');
      },
      onError: () => {
        close();
        notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
      },
    });
  }

  return (
    <>
      <Button color="red" variant="outline" onClick={open}>
        Delete trip
      </Button>
      <Modal opened={opened} onClose={close} title="Delete trip" centered>
        <Text>
          Delete &lsquo;{trip.title}&rsquo;? Its places, journal entries, photos and expenses will
          be deleted too.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button color="red" loading={deleteTrip.isPending} onClick={confirm}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
}
