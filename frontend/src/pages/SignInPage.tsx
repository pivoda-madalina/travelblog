import {
  Alert,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { ApiError } from '../api/client';
import { type Credentials, useCurrentUser, useSignIn } from '../features/auth/api';

export function SignInPage() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const { data: user } = useCurrentUser();
  const signIn = useSignIn();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Credentials>({
    mode: 'uncontrolled',
    initialValues: { username: '', password: '' },
    validate: {
      username: isNotEmpty('Enter your username.'),
      password: isNotEmpty('Enter your password.'),
    },
  });

  // Covers both a successful sign-in and an author who opens this page while signed in.
  if (user?.is_author) {
    return <Navigate to={from} replace />;
  }

  function handleSubmit(credentials: Credentials) {
    setError(null);
    signIn.mutate(credentials, {
      onError: (caught) => {
        if (caught instanceof ApiError && caught.status === 400) {
          const { non_field_errors: message, ...fieldErrors } = caught.fieldErrors;
          form.setErrors(fieldErrors);
          setError(message ?? null);
        } else {
          notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
        }
      },
    });
  }

  return (
    <Center pt="xl">
      <Paper withBorder shadow="sm" p="xl" w={400}>
        <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
          <Stack>
            <Title order={1} size="h2">
              Sign in
            </Title>
            <TextInput
              label="Username"
              autoComplete="username"
              key={form.key('username')}
              {...form.getInputProps('username')}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              key={form.key('password')}
              {...form.getInputProps('password')}
            />
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button type="submit" loading={signIn.isPending}>
                Sign in
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
