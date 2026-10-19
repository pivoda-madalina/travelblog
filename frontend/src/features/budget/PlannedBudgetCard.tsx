import { ActionIcon, Button, Card, Group, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

import { ApiError } from '../../api/client';
import { formatRon } from '../../lib/money';
import { type Trip, useSetPlannedBudget } from '../trips/api';

/** The Planned card of the Budget tab, edited in place (US-10). One total in RON, zero or more,
 * or empty for "Not set" (BR-01). */
export function PlannedBudgetCard({ trip }: { trip: Trip }) {
  const [editing, setEditing] = useState(false);

  return (
    <Card withBorder padding="md">
      <Text size="sm" c="dimmed">
        Planned
      </Text>
      {editing ? (
        <PlannedBudgetForm trip={trip} onDone={() => setEditing(false)} />
      ) : (
        <Group gap="xs" wrap="nowrap">
          <Text size="xl" fw={600}>
            {trip.planned_budget == null ? 'Not set' : formatRon(trip.planned_budget)}
          </Text>
          <ActionIcon
            variant="subtle"
            aria-label="Edit planned budget"
            onClick={() => setEditing(true)}
          >
            ✎
          </ActionIcon>
        </Group>
      )}
    </Card>
  );
}

function PlannedBudgetForm({ trip, onDone }: { trip: Trip; onDone: () => void }) {
  const setPlannedBudget = useSetPlannedBudget(trip.id);
  const form = useForm({ initialValues: { planned_budget: trip.planned_budget ?? '' } });

  async function handleSubmit({ planned_budget }: { planned_budget: string }) {
    // Thousands separators are allowed while typing; empty means "Not set".
    const value = planned_budget.replace(/[,\s]/g, '');
    try {
      await setPlannedBudget.mutateAsync(value === '' ? null : value);
      notifications.show({ color: 'green', message: 'Planned budget saved.' });
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        form.setErrors(caught.fieldErrors);
      } else {
        notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
      }
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <TextInput
        label="Planned budget"
        placeholder="Not set"
        inputMode="decimal"
        rightSection={<Text size="sm">RON</Text>}
        rightSectionWidth={48}
        mt={4}
        data-autofocus
        key={form.key('planned_budget')}
        {...form.getInputProps('planned_budget')}
      />
      <Group justify="flex-end" gap="xs" mt="xs">
        <Button size="xs" variant="default" onClick={onDone}>
          Cancel
        </Button>
        <Button size="xs" type="submit" loading={setPlannedBudget.isPending}>
          Save
        </Button>
      </Group>
    </form>
  );
}
