import { Alert, Button, Group, Loader, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

import { ApiError } from '../../api/client';
import type { Trip } from '../trips/api';
import { formatCoordinate, type Location, type Point, useAddPlace, useReverseGeocode } from './api';
import { countryOptions } from './countries';

interface AddPlaceModalProps {
  trip: Trip;
  /** The clicked point; the modal is open while it is set. */
  point: Point | null;
  onClose: () => void;
}

/** Wireframe 3, "Add place" (US-04). The name and country come from the clicked point; if the
 * lookup fails, the author types them. */
export function AddPlaceModal({ trip, point, onClose }: AddPlaceModalProps) {
  const lookup = useReverseGeocode(point);

  return (
    <Modal opened={point !== null} onClose={onClose} title="Add place" centered>
      {point &&
        (lookup.isPending ? (
          <TextInput label="Name" disabled rightSection={<Loader size="xs" />} aria-busy="true" />
        ) : (
          <PlaceForm trip={trip} point={point} location={lookup.data ?? null} onClose={onClose} />
        ))}
    </Modal>
  );
}

interface PlaceFormValues {
  name: string;
  country_code: string | null;
  visited_on: string | null;
}

interface PlaceFormProps {
  trip: Trip;
  point: Point;
  /** The lookup's answer, or null if it failed. */
  location: Location | null;
  onClose: () => void;
}

function PlaceForm({ trip, point, location, onClose }: PlaceFormProps) {
  const addPlace = useAddPlace(trip.id);
  const form = useForm<PlaceFormValues>({
    initialValues: {
      name: location?.name ?? '',
      country_code: location?.country_code ?? null,
      // A single-day trip has only one possible date.
      visited_on: trip.start_date === trip.end_date ? trip.start_date : null,
    },
    validate: {
      name: isNotEmpty('Enter the city name.'),
      country_code: isNotEmpty('Choose the country.'),
      visited_on: isNotEmpty('Choose the date visited.'),
    },
  });

  async function handleSubmit({ name, country_code, visited_on }: PlaceFormValues) {
    const code = country_code ?? '';
    const country =
      location?.country_code === code
        ? location.country_name
        : (countryOptions.find((option) => option.value === code)?.label ?? code);
    try {
      await addPlace.mutateAsync({
        name: name.trim(),
        country_code: code,
        country_name: country,
        latitude: formatCoordinate(point.lat),
        longitude: formatCoordinate(point.lng),
        visited_on: visited_on ?? '',
      });
      notifications.show({ color: 'green', message: 'Place added.' });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        form.setErrors(caught.fieldErrors);
      } else {
        notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
      }
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <Stack>
        {location === null && (
          <Alert color="yellow">
            Couldn&rsquo;t look up this location. Type the city name and country.
          </Alert>
        )}
        <TextInput
          label="Name"
          withAsterisk
          key={form.key('name')}
          {...form.getInputProps('name')}
        />
        {location ? (
          <div>
            <Text size="sm" fw={500}>
              Country
            </Text>
            <Text>{location.country_name}</Text>
          </div>
        ) : (
          <Select
            label="Country"
            withAsterisk
            searchable
            data={countryOptions}
            key={form.key('country_code')}
            {...form.getInputProps('country_code')}
          />
        )}
        <DatePickerInput
          label="Visited"
          placeholder="Date visited"
          valueFormat="D MMM YYYY"
          withAsterisk
          minDate={trip.start_date}
          maxDate={trip.end_date}
          defaultDate={trip.start_date}
          key={form.key('visited_on')}
          {...form.getInputProps('visited_on')}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={addPlace.isPending}>
            Add place
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
