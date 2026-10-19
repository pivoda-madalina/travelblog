import {
  Button,
  Group,
  Image,
  Input,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DatePickerInput, type DatesRangeValue } from '@mantine/dates';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { isNotEmpty, useForm } from '@mantine/form';

import { ApiError } from '../../api/client';
import type { Trip, TripInput, TripStatus } from './api';

// The proposed answer to #26; the backend checks the same limits.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

interface TripFormValues {
  title: string;
  dates: DatesRangeValue<string>;
  summary: string;
  status: TripStatus;
  cover_photo: File | null;
}

/** API field names that the form shows under a differently named input. */
const fieldForApiError: Record<string, keyof TripFormValues> = {
  start_date: 'dates',
  end_date: 'dates',
};

interface TripFormProps {
  /** The trip being edited; without it the form starts empty. */
  trip?: Trip;
  submitting: boolean;
  onSubmit: (trip: TripInput) => Promise<unknown>;
  onCancel: () => void;
  onUnexpectedError: () => void;
}

/** The trip form from wireframe 2. Business rules are checked by the API, whose field errors
 * appear under the matching input; the checks here only catch empty fields early. */
export function TripForm({
  trip,
  submitting,
  onSubmit,
  onCancel,
  onUnexpectedError,
}: TripFormProps) {
  const form = useForm<TripFormValues>({
    initialValues: {
      title: trip?.title ?? '',
      dates: [trip?.start_date ?? null, trip?.end_date ?? null],
      summary: trip?.summary ?? '',
      status: trip?.status ?? 'draft',
      cover_photo: null,
    },
    validate: {
      title: isNotEmpty('Enter a title.'),
      dates: ([start, end]) => (start && end ? null : 'Choose the start and end dates.'),
    },
  });

  async function handleSubmit({ dates: [start, end], ...values }: TripFormValues) {
    try {
      await onSubmit({ ...values, start_date: start ?? '', end_date: end ?? '' });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        const errors: Record<string, string> = {};
        for (const [field, message] of Object.entries(caught.fieldErrors)) {
          errors[fieldForApiError[field] ?? field] = message;
        }
        form.setErrors(errors);
      } else {
        onUnexpectedError();
      }
    }
  }

  const cover = form.getValues().cover_photo;

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <Stack maw={720}>
        <TextInput
          label="Title"
          withAsterisk
          key={form.key('title')}
          {...form.getInputProps('title')}
        />
        <DatePickerInput
          type="range"
          allowSingleDateInRange
          label="Dates"
          placeholder="Start and end dates"
          valueFormat="D MMM YYYY"
          withAsterisk
          key={form.key('dates')}
          {...form.getInputProps('dates')}
        />
        <Textarea
          label="Summary"
          autosize
          minRows={3}
          key={form.key('summary')}
          {...form.getInputProps('summary')}
        />
        <Input.Wrapper label="Cover photo" error={form.errors.cover_photo}>
          <Group mt={4} align="stretch" wrap="nowrap">
            <Dropzone
              flex={1}
              multiple={false}
              accept={[MIME_TYPES.jpeg]}
              maxSize={MAX_PHOTO_BYTES}
              onDrop={([file]) => {
                form.setFieldValue('cover_photo', file ?? null);
                form.clearFieldError('cover_photo');
              }}
              onReject={() => form.setFieldError('cover_photo', 'Choose a JPEG of at most 10 MB.')}
            >
              <Text ta="center" c="dimmed" py="md">
                {cover ? `${cover.name} selected` : 'Drop a JPEG here or browse'}
              </Text>
            </Dropzone>
            {/* The current cover stays until a new file replaces it (US-02). */}
            {trip?.cover_photo && !cover && (
              <Image src={trip.cover_photo} alt="Current cover photo" w={120} radius="md" />
            )}
          </Group>
        </Input.Wrapper>
        <Input.Wrapper label="Status">
          <div>
            <SegmentedControl
              mt={4}
              data={[
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
              ]}
              key={form.key('status')}
              {...form.getInputProps('status')}
            />
          </div>
        </Input.Wrapper>
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save trip
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
