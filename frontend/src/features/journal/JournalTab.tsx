import { Button, Divider, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useParams } from 'react-router';

import { useCurrentUser } from '../auth/api';
import { useTrip } from '../trips/api';
import { type JournalEntry, type Photo, useJournalEntries, usePhotos } from './api';
import { EntryModal } from './EntryModal';
import { Markdown } from './Markdown';
import { PhotoGrid } from './PhotoGrid';

/** The entries of each day, in date order; the API sends them sorted. */
function byDay(entries: JournalEntry[]): [string, JournalEntry[]][] {
  const days = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);
  }
  return [...days.entries()];
}

/** Each entry's attached photos, in upload order; gallery-only photos are left out. */
function byEntry(photos: Photo[]): Map<number, Photo[]> {
  const entries = new Map<number, Photo[]>();
  for (const photo of photos) {
    if (photo.journal_entry !== null) {
      entries.set(photo.journal_entry, [...(entries.get(photo.journal_entry) ?? []), photo]);
    }
  }
  return entries;
}

/** Wireframe 4: entries grouped by day, several to a day (US-07), each with its attached photos
 * (US-09). Visitors read them; only the author writes and edits. */
export function JournalTab() {
  const { tripId = '' } = useParams();
  // The trip page has loaded the trip already, so this reads it from the cache.
  const { data: trip } = useTrip(tripId);
  const { data: user } = useCurrentUser();
  const entries = useJournalEntries(Number(tripId));
  // The journal reads without photos while they load or if they fail.
  const { data: photos = [] } = usePhotos(Number(tripId));
  // undefined: closed; null: writing a new entry; an entry: editing it.
  const [editing, setEditing] = useState<JournalEntry | null | undefined>(undefined);

  if (!trip || entries.isPending) {
    return <Skeleton height={240} />;
  }
  if (entries.isError) {
    return <Text c="gray">Something went wrong. Try again.</Text>;
  }

  const isAuthor = user?.is_author ?? false;
  const entryPhotos = byEntry(photos);
  return (
    <Stack gap="xl">
      {isAuthor && (
        <Group justify="flex-end">
          <Button onClick={() => setEditing(null)}>+ New entry</Button>
        </Group>
      )}
      {entries.data.length === 0 && <Text c="gray">No journal entries yet.</Text>}
      {byDay(entries.data).map(([date, dayEntries]) => (
        <section key={date}>
          <Title order={3}>{dayjs(date).format('dddd, D MMMM YYYY')}</Title>
          <Divider my="sm" />
          <Stack gap="lg">
            {dayEntries.map((entry) => (
              <article key={entry.id}>
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Title order={4}>{entry.title}</Title>
                  <Group gap="sm" wrap="nowrap">
                    {entry.place_name && (
                      <Text size="sm" c="dimmed">
                        📍 {entry.place_name}
                      </Text>
                    )}
                    {isAuthor && (
                      <Button
                        size="xs"
                        variant="default"
                        aria-label={`Edit ${entry.title}`}
                        onClick={() => setEditing(entry)}
                      >
                        Edit
                      </Button>
                    )}
                  </Group>
                </Group>
                <Markdown>{entry.body}</Markdown>
                {entryPhotos.has(entry.id) && (
                  <PhotoGrid photos={entryPhotos.get(entry.id) ?? []} cols={6} height={100} />
                )}
              </article>
            ))}
          </Stack>
        </section>
      ))}
      {isAuthor && (
        <EntryModal
          trip={trip}
          opened={editing !== undefined}
          entry={editing ?? null}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Stack>
  );
}
