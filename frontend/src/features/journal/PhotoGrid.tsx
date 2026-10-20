import { Image, SimpleGrid, Text, UnstyledButton } from '@mantine/core';
import { useState } from 'react';

import type { Photo } from './api';
import { PhotoViewer } from './PhotoViewer';

interface PhotoGridProps {
  photos: Photo[];
  cols: number;
  /** The thumbnail height in pixels. */
  height: number;
  withCaptions?: boolean;
}

/** Thumbnails, the smaller copies (US-08). Clicking one opens the viewer on it, with arrows to
 * the other photos of the grid (US-09). */
export function PhotoGrid({ photos, cols, height, withCaptions = false }: PhotoGridProps) {
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <>
      <SimpleGrid cols={cols}>
        {photos.map((photo, index) => (
          <figure key={photo.id} style={{ margin: 0 }}>
            <UnstyledButton
              display="block"
              w="100%"
              aria-label={`Open ${photo.caption || 'photo'}`}
              onClick={() => setViewing(index)}
            >
              <Image
                src={photo.thumbnail}
                alt={photo.caption || 'Trip photo'}
                radius="md"
                h={height}
                fit="cover"
                loading="lazy"
              />
            </UnstyledButton>
            {withCaptions && photo.caption && (
              <Text component="figcaption" size="sm" mt={4}>
                {photo.caption}
              </Text>
            )}
          </figure>
        ))}
      </SimpleGrid>
      <PhotoViewer
        photos={photos}
        index={viewing}
        onChange={setViewing}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
