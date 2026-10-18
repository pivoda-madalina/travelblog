import { Anchor, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <Title order={1}>Page not found</Title>
      <Text>
        <Anchor component={Link} to="/">
          Back to trips
        </Anchor>
      </Text>
    </>
  );
}
