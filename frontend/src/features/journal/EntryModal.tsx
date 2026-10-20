import {
  Button,
  Grid,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/dates';
import { usePlaces } from '../places/api';
import type { Trip } from '../trips/api';
import { type JournalEntry, useAddEntry, useDeleteEntry, useUpdateEntry } from './api';
import { Markdown } from './Markdown';

interface EntryModalProps {
  trip: Trip;
  opened: boolean;
  /** The entry being edited, or null to write a new one. */
  entry: JournalEntry | null;
  onClose: () => void;
}

/** The entry editor of wireframe 4, a modal at full width with a live preview (US-07). */
export function EntryModal({ trip, opened, entry, onClose }: EntryModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={entry ? 'Edit journal entry' : 'New journal entry'}
      size="100%"
    >
      {/* Keyed, so the form starts afresh for each entry. */}
      <EntryForm key={entry?.id ?? 'new'} trip={trip} entry={entry} onClose={onClose} />
    </Modal>
  );
}

interface EntryFormValues {
  date: string | null;
  place: string | null;
  title: string;
  body: string;
}

interface EntryFormProps {
  trip: Trip;
  entry: JournalEntry | null;
  onClose: () => void;
}

function EntryForm({ trip, entry, onClose }: EntryFormProps) {
  const addEntry = useAddEntry(trip.id);
  const updateEntry = useUpdateEntry(trip.id);
  const { data: places = [] } = usePlaces(trip.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const form = useForm<EntryFormValues>({
    initialValues: {
      date: entry?.date ?? null,
      place: entry?.place == null ? null : String(entry.place),
      title: entry?.title ?? '',
      body: entry?.body ?? '',
    },
    validate: {
      date: isNotEmpty('Choose the date.'),
      title: isNotEmpty('Enter a title.'),
    },
  });
  const { title, body } = form.getValues();

  if (entry && confirmingDelete) {
    return (
      <DeleteEntry
        trip={trip}
        entry={entry}
        onCancel={() => setConfirmingDelete(false)}
        onDeleted={onClose}
      />
    );
  }

  async function handleSubmit(values: EntryFormValues) {
    const input = {
      date: values.date ?? '',
      place: values.place === null ? null : Number(values.place),
      title: values.title.trim(),
      body: values.body,
    };
    try {
      if (entry) {
        await updateEntry.mutateAsync({ id: entry.id, ...input });
      } else {
        await addEntry.mutateAsync(input);
      }
      notifications.show({ color: 'green', message: 'Entry saved.' });
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        form.setErrors(caught.fieldErrors);
      } else {
        notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
      }
    }
  }

  const placeOptions = places.map((place) => ({
    value: String(place.id),
    label: `${place.city.name}, ${formatDate(place.visited_on)}`,
  }));

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <Stack>
        <Group grow align="flex-start">
          {/* BR-09: an entry is dated within its trip. */}
          <DatePickerInput
            label="Date"
            valueFormat="D MMM YYYY"
            withAsterisk
            minDate={trip.start_date}
            maxDate={trip.end_date}
            defaultDate={trip.start_date}
            key={form.key('date')}
            {...form.getInputProps('date')}
          />
          <Select
            label="Place"
            placeholder="Optional"
            data={placeOptions}
            clearable
            key={form.key('place')}
            {...form.getInputProps('place')}
          />
          <TextInput
            label="Title"
            withAsterisk
            maxLength={200}
            key={form.key('title')}
            {...form.getInputProps('title')}
          />
        </Group>
        <Grid gap="lg">
          <Grid.Col span={6}>
            <Textarea
              label="Markdown"
              description="Headings (##), **bold** and - lists"
              autosize
              minRows={12}
              key={form.key('body')}
              {...form.getInputProps('body')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Text size="sm" fw={500} mb={4}>
              Preview
            </Text>
            <Paper withBorder p="md" mih={260} aria-label="Preview">
              <Title order={4} mb="sm">
                {title}
              </Title>
              <Markdown>{body}</Markdown>
            </Paper>
          </Grid.Col>
        </Grid>
        <Group justify="space-between">
          {entry ? (
            <Button color="red" variant="outline" onClick={() => setConfirmingDelete(true)}>
              Delete entry
            </Button>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={addEntry.isPending || updateEntry.isPending}>
              Save entry
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
}

interface DeleteEntryProps {
  trip: Trip;
  entry: JournalEntry;
  onCancel: () => void;
  onDeleted: () => void;
}

function DeleteEntry({ trip, entry, onCancel, onDeleted }: DeleteEntryProps) {
  const deleteEntry = useDeleteEntry(trip.id);

  function confirm() {
    deleteEntry.mutate(entry.id, {
      onSuccess: () => {
        notifications.show({ color: 'green', message: 'Entry deleted.' });
        onDeleted();
      },
      onError: () => {
        onCancel();
        notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
      },
    });
  }

  return (
    <>
      {/* BR-11: an entry's photos go with it. */}
      <Text>Delete &lsquo;{entry.title}&rsquo;? Its attached photos will be deleted too.</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="red" loading={deleteEntry.isPending} onClick={confirm}>
          Delete
        </Button>
      </Group>
    </>
  );
}
