import { Box, Center, Loader, Paper, Text, Title } from '@mantine/core';

import { useWorldMap } from '../features/map/api';
import { WorldMapCanvas } from '../features/map/WorldMapCanvas';

function plural(count: number, word: string, words: string): string {
  return `${count} ${count === 1 ? word : words}`;
}

/** Screen 7: the public map, the same for the author and visitors (BR-13). */
export function WorldMapPage() {
  const { data, isPending, isError } = useWorldMap();

  return (
    <>
      <Title order={1} mb="lg">
        World map
      </Title>
      <Box
        pos="relative"
        h="calc(100vh - 200px)"
        mih={420}
        style={{ borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}
      >
        {isPending ? (
          <Center h="100%">
            <Loader />
          </Center>
        ) : isError ? (
          <Center h="100%">
            <Text c="gray">Something went wrong. Try again.</Text>
          </Center>
        ) : (
          <>
            <WorldMapCanvas countries={data.countries} cities={data.cities} />
            {data.cities.length === 0 ? (
              <Center pos="absolute" inset={0} style={{ zIndex: 1000, pointerEvents: 'none' }}>
                <Paper shadow="sm" px="lg" py="md">
                  <Text c="gray">No places visited yet.</Text>
                </Paper>
              </Center>
            ) : (
              <Paper
                shadow="sm"
                px="md"
                py="xs"
                pos="absolute"
                bottom={24}
                left={12}
                style={{ zIndex: 1000 }}
              >
                <Text size="sm">
                  {plural(data.countries.length, 'country', 'countries')} ·{' '}
                  {plural(data.cities.length, 'city', 'cities')}
                </Text>
              </Paper>
            )}
          </>
        )}
      </Box>
    </>
  );
}
