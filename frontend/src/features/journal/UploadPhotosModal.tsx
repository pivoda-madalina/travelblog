import {
  ActionIcon,
  Button,
  Group,
  Image,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { Dropzone, type FileRejection, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/dates';
import { MAX_PHOTO_BYTES } from '../../lib/photos';
import type { Trip } from '../trips/api';
import { useJournalEntries, usePhotosChanged, useUploadPhoto } from './api';

interface UploadPhotosModalProps {
  trip: Trip;
  opened: boolean;
  onClose: () => void;
}

/** The upload modal of wireframe 5: several JPEGs at once, each with its own caption (US-08). */
export function UploadPhotosModal({ trip, opened, onClose }: UploadPhotosModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Upload photos" size="lg">
      {/* Mounted while open only, so each upload starts with no files. The API refuses a
          photo past the trip's limit, and that file shows the reason. */}
      {opened && <UploadForm trip={trip} onClose={onClose} />}
    </Modal>
  );
}

interface Selected {
  key: number;
  file: File;
  /** An object URL for the thumbnail, revoked once the file leaves the list. */
  preview: string;
  caption: string;
  error?: string;
}

/** Why the dropzone refused a file, as the author should read it. */
function rejectionReason({ file, errors }: FileRejection): string {
  const tooLarge = errors.some((error) => error.code === 'file-too-large');
  return `${file.name}: ${tooLarge ? 'larger than 10 MB' : 'not a JPEG'}.`;
}

let nextKey = 0;

function UploadForm({ trip, onClose }: Omit<UploadPhotosModalProps, 'opened'>) {
  const uploadPhoto = useUploadPhoto(trip.id);
  const photosChanged = usePhotosChanged(trip.id);
  const { data: entries = [] } = useJournalEntries(trip.id);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [entry, setEntry] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Previews still in the list when the modal closes are released too.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const open = previews.current;
    return () => open.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function add(files: File[]) {
    const added = files.map((file) => ({
      key: nextKey++,
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }));
    added.forEach((item) => previews.current.add(item.preview));
    setSelected((current) => [...current, ...added]);
    setRejected([]);
  }

  function release(items: Selected[]) {
    for (const item of items) {
      URL.revokeObjectURL(item.preview);
      previews.current.delete(item.preview);
    }
  }

  function remove(item: Selected) {
    release([item]);
    setSelected((current) => current.filter((other) => other.key !== item.key));
  }

  function update(key: number, changes: Partial<Selected>) {
    setSelected((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );
  }

  async function upload() {
    setUploading(true);
    const failed: Selected[] = [];
    // One at a time, so a refused file leaves the others uploaded.
    for (const item of selected) {
      try {
        await uploadPhoto.mutateAsync({
          image: item.file,
          caption: item.caption.trim(),
          journal_entry: entry === null ? null : Number(entry),
        });
      } catch (caught) {
        const fieldErrors = caught instanceof ApiError ? caught.fieldErrors : {};
        const error =
          caught instanceof ApiError && caught.status === 400
            ? (Object.values(fieldErrors)[0] ?? 'This photo was refused.')
            : 'Something went wrong. Try again.';
        failed.push({ ...item, error });
      }
    }
    await photosChanged();
    setUploading(false);
    const uploaded = selected.length - failed.length;
    if (uploaded > 0) {
      notifications.show({
        color: 'green',
        message: uploaded === 1 ? '1 photo uploaded.' : `${uploaded} photos uploaded.`,
      });
    }
    release(selected.filter((item) => !failed.some((other) => other.key === item.key)));
    if (failed.length === 0) {
      onClose();
    } else {
      setSelected(failed);
    }
  }

  const entryOptions = entries.map((item) => ({
    value: String(item.id),
    label: `${item.title}, ${formatDate(item.date)}`,
  }));

  return (
    <Stack>
      <Dropzone
        accept={[MIME_TYPES.jpeg]}
        maxSize={MAX_PHOTO_BYTES}
        onDrop={add}
        onReject={(rejections) => setRejected(rejections.map(rejectionReason))}
      >
        <Text ta="center" c="dimmed" py="md">
          Drop JPEG files here or browse (max 10 MB each, 10 photos per trip)
        </Text>
      </Dropzone>
      {rejected.map((reason) => (
        <Text key={reason} size="sm" c="red">
          {reason}
        </Text>
      ))}
      {selected.map((item) => (
        <Stack key={item.key} gap={4}>
          <Group wrap="nowrap">
            <Image src={item.preview} alt="" w={48} h={48} radius="sm" fit="cover" />
            <Text size="sm" w={140} truncate="end">
              {item.file.name}
            </Text>
            <TextInput
              flex={1}
              placeholder="Caption"
              aria-label={`Caption for ${item.file.name}`}
              maxLength={300}
              value={item.caption}
              onChange={(event) => update(item.key, { caption: event.currentTarget.value })}
            />
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label={`Remove ${item.file.name}`}
              onClick={() => remove(item)}
            >
              ✕
            </ActionIcon>
          </Group>
          {item.error && (
            <Text size="sm" c="red">
              {item.error}
            </Text>
          )}
        </Stack>
      ))}
      <Select
        label="Attach to entry"
        placeholder="None (gallery only)"
        data={entryOptions}
        clearable
        value={entry}
        onChange={setEntry}
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={selected.length === 0} loading={uploading} onClick={upload}>
          Upload {selected.length}
        </Button>
      </Group>
    </Stack>
  );
}
