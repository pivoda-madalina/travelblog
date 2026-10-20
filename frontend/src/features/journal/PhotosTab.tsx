import { Button, Group, Skeleton, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useParams } from 'react-router';

import { useCurrentUser } from '../auth/api';
import { useTrip } from '../trips/api';
import { usePhotos } from './api';
import { PhotoGrid } from './PhotoGrid';
import { UploadPhotosModal } from './UploadPhotosModal';

/** Wireframe 5: the trip's gallery as thumbnails with their captions (US-08), each opening the
 * viewer (US-09). Visitors see it too; only the author uploads. */
export function PhotosTab() {
  const { tripId = '' } = useParams();
  // The trip page has loaded the trip already, so this reads it from the cache.
  const { data: trip } = useTrip(tripId);
  const { data: user } = useCurrentUser();
  const photos = usePhotos(Number(tripId));
  const [uploading, setUploading] = useState(false);

  if (!trip || photos.isPending) {
    return <Skeleton height={240} />;
  }
  if (photos.isError) {
    return <Text c="gray">Something went wrong. Try again.</Text>;
  }

  const isAuthor = user?.is_author ?? false;
  return (
    <Stack>
      {isAuthor && (
        <Group justify="flex-end">
          <Button onClick={() => setUploading(true)}>+ Upload photos</Button>
        </Group>
      )}
      {photos.data.length === 0 && <Text c="gray">No photos yet.</Text>}
      <PhotoGrid photos={photos.data} cols={5} height={160} withCaptions />
      {isAuthor && (
        <UploadPhotosModal trip={trip} opened={uploading} onClose={() => setUploading(false)} />
      )}
    </Stack>
  );
}
