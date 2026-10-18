import { Button, Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Link, useLocation } from 'react-router';

import { useCurrentUser, useSignOut } from './api';

/** The right side of the header: a Sign in button for visitors, the author menu once signed in. */
export function AuthMenu() {
  const { data: user, isPending } = useCurrentUser();
  const signOut = useSignOut();
  const location = useLocation();

  if (isPending) {
    return null;
  }

  if (!user?.is_author) {
    // Remember the current page, so signing in returns to it.
    return (
      <Button
        component={Link}
        to="/sign-in"
        state={{ from: `${location.pathname}${location.search}` }}
        variant="default"
      >
        Sign in
      </Button>
    );
  }

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button variant="subtle">{user.username}</Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={() =>
            signOut.mutate(undefined, {
              onError: () =>
                notifications.show({ color: 'red', message: 'Something went wrong. Try again.' }),
            })
          }
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
