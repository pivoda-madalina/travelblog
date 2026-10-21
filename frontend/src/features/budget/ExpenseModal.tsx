import { Autocomplete, Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { isNotEmpty, matches, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/dates';
import { formatRate } from '../../lib/money';
import type { Trip } from '../trips/api';
import {
  type Category,
  categoryOptions,
  type Expense,
  useAddExpense,
  useDeleteExpense,
  useNbrRate,
  useUpdateExpense,
} from './api';
import { currencyOptions } from './currencies';

interface ExpenseModalProps {
  trip: Trip;
  opened: boolean;
  /** The expense being edited, or null to add one. */
  expense: Expense | null;
  onClose: () => void;
}

/** The expense form of wireframe 6, for adding and editing (US-11). */
export function ExpenseModal({ trip, opened, expense, onClose }: ExpenseModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={expense ? 'Edit expense' : 'Add expense'}
      centered
    >
      {/* Keyed, so the form starts afresh for each expense. */}
      <ExpenseForm key={expense?.id ?? 'new'} trip={trip} expense={expense} onClose={onClose} />
    </Modal>
  );
}

interface ExpenseFormValues {
  date: string | null;
  description: string;
  category: Category | null;
  amount: string;
  currency: string;
  rate: string;
}

interface ExpenseFormProps {
  trip: Trip;
  expense: Expense | null;
  onClose: () => void;
}

function ExpenseForm({ trip, expense, onClose }: ExpenseFormProps) {
  const addExpense = useAddExpense(trip.id);
  const updateExpense = useUpdateExpense(trip.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const form = useForm<ExpenseFormValues>({
    initialValues: {
      date: expense?.date ?? null,
      description: expense?.description ?? '',
      category: expense?.category ?? null,
      amount: expense?.amount ?? '',
      currency: expense?.currency ?? 'RON',
      // Only a rate the author typed is shown; an empty rate means "use the NBR rate".
      rate: expense?.rate_source === 'manual' ? expense.rate : '',
    },
    validate: {
      date: isNotEmpty('Choose the date.'),
      description: isNotEmpty('Enter a description.'),
      category: isNotEmpty('Choose a category.'),
      amount: isNotEmpty('Enter the amount.'),
      currency: matches(/^[A-Z]{3}$/, 'Enter a three-letter currency code, for example EUR.'),
    },
    // A typed rate belongs to its date and currency, so it is cleared when either changes and
    // the rate is looked up again (BR-02).
    onValuesChange: (values, previous) => {
      const moved = values.date !== previous.date || values.currency !== previous.currency;
      if (moved && values.rate !== '') {
        form.setFieldValue('rate', '');
      }
    },
  });
  const { date, currency } = form.getValues();
  // An NBR rate already saved is kept while the date and currency stay the same (BR-05).
  const savedNbrRate =
    expense?.rate_source === 'nbr' && expense.date === date && expense.currency === currency
      ? expense.rate
      : null;
  const nbrRate = useNbrRate(currency, savedNbrRate === null ? date : null);

  if (expense && confirmingDelete) {
    return (
      <DeleteExpense
        trip={trip}
        expense={expense}
        onCancel={() => setConfirmingDelete(false)}
        onDeleted={onClose}
      />
    );
  }

  async function handleSubmit(values: ExpenseFormValues) {
    const isRon = values.currency === 'RON';
    // Thousands separators are allowed while typing.
    const input = {
      date: values.date ?? '',
      description: values.description.trim(),
      category: values.category ?? 'other',
      amount: values.amount.replace(/[,\s]/g, ''),
      currency: values.currency,
      rate: isRon || values.rate.trim() === '' ? null : values.rate.replace(/[,\s]/g, ''),
    };
    try {
      if (expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...input });
      } else {
        await addExpense.mutateAsync(input);
      }
      notifications.show({ color: 'green', message: 'Expense saved.' });
      onClose();
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
      <Stack>
        <DatePickerInput
          label="Date"
          placeholder="Date paid"
          valueFormat="D MMM YYYY"
          withAsterisk
          // Only a draft can have expenses paid before the trip starts (#27).
          minDate={trip.status === 'draft' ? undefined : trip.start_date}
          maxDate={trip.end_date}
          defaultDate={trip.start_date}
          key={form.key('date')}
          {...form.getInputProps('date')}
        />
        <TextInput
          label="Description"
          withAsterisk
          maxLength={200}
          key={form.key('description')}
          {...form.getInputProps('description')}
        />
        <Select
          label="Category"
          withAsterisk
          data={categoryOptions}
          key={form.key('category')}
          {...form.getInputProps('category')}
        />
        <Group grow align="flex-start">
          <TextInput
            label="Amount"
            withAsterisk
            inputMode="decimal"
            key={form.key('amount')}
            {...form.getInputProps('amount')}
          />
          <Autocomplete
            label="Currency"
            withAsterisk
            data={currencyOptions}
            maxLength={3}
            key={form.key('currency')}
            {...form.getInputProps('currency')}
            onChange={(value) => form.setFieldValue('currency', value.toUpperCase())}
          />
        </Group>
        {/* RON expenses are not converted (BR-06). */}
        {currency !== 'RON' && (
          <TextInput
            label="Rate"
            inputMode="decimal"
            rightSection={<Text size="sm">RON per 1 {currency}</Text>}
            rightSectionWidth={120}
            {...rateHint(savedNbrRate, date === null ? undefined : nbrRate)}
            key={form.key('rate')}
            {...form.getInputProps('rate')}
          />
        )}
        <Group justify="space-between">
          {expense ? (
            <Button color="red" variant="outline" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Group gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={addExpense.isPending || updateExpense.isPending}>
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
}

/** What the rate field says about the rate used if it is left empty (US-12). */
function rateHint(
  savedNbrRate: string | null,
  nbrRate: ReturnType<typeof useNbrRate> | undefined,
): { placeholder?: string; description: string; withAsterisk?: boolean } {
  const override = 'or enter the rate from your bank statement.';
  if (savedNbrRate !== null) {
    return {
      placeholder: formatRate(savedNbrRate),
      description: `The saved NBR rate. Leave empty to keep it, ${override}`,
    };
  }
  if (nbrRate === undefined || !nbrRate.isEnabled) {
    return {
      description: `Leave empty to use the NBR rate for the date, ${override}`,
    };
  }
  if (nbrRate.isPending) {
    return { placeholder: 'Looking up the NBR rate…', description: '' };
  }
  if (nbrRate.data?.rate && nbrRate.data.rate_date) {
    return {
      placeholder: formatRate(nbrRate.data.rate),
      description: `NBR rate of ${formatDate(nbrRate.data.rate_date)}. Leave empty to use it, ${override}`,
    };
  }
  if (nbrRate.data) {
    // No NBR rate for this currency, so the author must enter one (BR-04).
    return { description: nbrRate.data.detail, withAsterisk: true };
  }
  return {
    description: `Couldn’t look up the NBR rate. Leave empty to try again on save, ${override}`,
  };
}

interface DeleteExpenseProps {
  trip: Trip;
  expense: Expense;
  onCancel: () => void;
  onDeleted: () => void;
}

function DeleteExpense({ trip, expense, onCancel, onDeleted }: DeleteExpenseProps) {
  const deleteExpense = useDeleteExpense(trip.id);

  function confirm() {
    deleteExpense.mutate(expense.id, {
      onSuccess: () => {
        notifications.show({ color: 'green', message: 'Expense deleted.' });
        onDeleted();
      },
      onError: () => {
        onCancel();
        notifications.show({ color: 'red', message: 'Something went wrong. Try again.' });
      },
    });
  }

  return (
    <>
      <Text>Delete &lsquo;{expense.description}&rsquo;?</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="red" loading={deleteExpense.isPending} onClick={confirm}>
          Delete
        </Button>
      </Group>
    </>
  );
}
