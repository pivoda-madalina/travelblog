import { ActionIcon, Group, Image, Modal, Stack } from '@mantine/core';
import { useWindowEvent } from '@mantine/hooks';

import type { Photo } from './api';

interface PhotoViewerProps {
  photos: Photo[];
  /** The photo shown, or null when the viewer is closed. */
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
}

/** The full-screen viewer of wireframe 5 (US-09): the photo at full size on a dark backdrop,
 * with arrows, the left and right arrow keys, and Escape to close. */
export function PhotoViewer({ photos, index, onChange, onClose }: PhotoViewerProps) {
  const photo = index === null ? undefined : photos[index];
  const hasPrevious = index !== null && index > 0;
  const hasNext = index !== null && index < photos.length - 1;

  useWindowEvent('keydown', (event) => {
    if (index === null) {
      return;
    }
    if (event.key === 'ArrowLeft' && hasPrevious) {
      onChange(index - 1);
    } else if (event.key === 'ArrowRight' && hasNext) {
      onChange(index + 1);
    }
  });

  return (
    <Modal
      opened={photo !== undefined}
      onClose={onClose}
      fullScreen
      title={photo ? `${photo.caption || 'Photo'} · ${(index ?? 0) + 1} / ${photos.length}` : ''}
      styles={{
        content: { background: 'var(--mantine-color-dark-9)' },
        header: { background: 'var(--mantine-color-dark-9)', color: 'var(--mantine-color-white)' },
      }}
      closeButtonProps={{ 'aria-label': 'Close viewer' }}
    >
      {photo && (
        <Group wrap="nowrap" justify="space-between" h="calc(100vh - 100px)">
          <ArrowButton
            label="Previous photo"
            disabled={!hasPrevious}
            onClick={() => onChange((index ?? 0) - 1)}
          >
            ‹
          </ArrowButton>
          <Stack align="center" justify="center" h="100%" flex={1} miw={0}>
            <Image
              src={photo.image}
              alt={photo.caption || 'Trip photo'}
              fit="contain"
              mah="calc(100vh - 140px)"
              w="auto"
            />
          </Stack>
          <ArrowButton
            label="Next photo"
            disabled={!hasNext}
            onClick={() => onChange((index ?? 0) + 1)}
          >
            ›
          </ArrowButton>
        </Group>
      )}
    </Modal>
  );
}

interface ArrowButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}

/** A light arrow on a dark disc, readable on the dark backdrop. At either end of the photos the
 * arrow fades out instead of taking Mantine's light disabled background. */
function ArrowButton({ label, disabled, onClick, children }: ArrowButtonProps) {
  return (
    <ActionIcon
      size={56}
      radius="xl"
      variant="filled"
      color="dark.5"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        fontSize: 36,
        lineHeight: 1,
        color: 'var(--mantine-color-white)',
        ...(disabled && { background: 'transparent', opacity: 0.25 }),
      }}
    >
      {children}
    </ActionIcon>
  );
}
