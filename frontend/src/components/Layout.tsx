import { Anchor, AppShell, Container, Group, Title } from '@mantine/core';
import { Link, NavLink, Outlet } from 'react-router';

import { AuthMenu } from '../features/auth/AuthMenu';

const navLinks = [
  { to: '/', label: 'Trips' },
  { to: '/map', label: 'World map' },
];

export function Layout() {
  return (
    <AppShell header={{ height: 64 }}>
      <AppShell.Header bg="gray.0">
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="xl">
              <Anchor component={Link} to="/" underline="never" c="inherit">
                <Title order={3}>Travel Blog</Title>
              </Anchor>
              <Group component="nav" gap="lg">
                {navLinks.map(({ to, label }) => (
                  <Anchor key={to} component={NavLink} to={to} end>
                    {label}
                  </Anchor>
                ))}
              </Group>
            </Group>
            <AuthMenu />
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl" py="xl">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
