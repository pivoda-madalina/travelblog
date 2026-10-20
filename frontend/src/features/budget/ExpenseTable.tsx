import { Anchor, Badge, Button, Group, Skeleton, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';

import { formatDate } from '../../lib/dates';
import { formatRate, formatRon } from '../../lib/money';
import type { Trip } from '../trips/api';
import { categories, type Expense, useBudget, useExpenses } from './api';
import { ExpenseModal } from './ExpenseModal';

/** 1,234.50 EUR: an amount in its own currency, from the API's decimal string. */
function formatAmount(amount: string, currency: string): string {
  const [whole = '0', fraction = '00'] = amount.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction} ${currency}`;
}

/** The rate used and its source (US-12). RON expenses are not converted (BR-06). */
function Rate({ expense }: { expense: Expense }) {
  if (expense.currency === 'RON') {
    return <Text c="dimmed">-</Text>;
  }
  return (
    <Group gap={6} wrap="nowrap">
      {formatRate(expense.rate)}
      <Badge size="sm" variant="light" color={expense.rate_source === 'nbr' ? 'gray' : 'blue'}>
        {expense.rate_source === 'nbr' ? 'NBR' : 'Manual'}
      </Badge>
    </Group>
  );
}

/** The Expenses section of wireframe 6 (US-11, US-12). Each expense shows its original amount,
 * the rate used and the RON amount. Clicking a row opens it for editing. */
export function ExpenseTable({ trip }: { trip: Trip }) {
  const { data: expenses, isPending, isError } = useExpenses(trip.id);
  // The total comes from the API, which adds up the rounded amounts (BR-07).
  const { data: summary } = useBudget(trip.id);
  // undefined: closed; null: adding; an expense: editing it.
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);

  return (
    <section>
      <Group justify="space-between" mb="sm">
        <Title order={3}>Expenses</Title>
        <Button onClick={() => setEditing(null)}>+ Add expense</Button>
      </Group>
      {isPending ? (
        <Skeleton height={120} />
      ) : isError ? (
        <Text c="red">Something went wrong. Try again.</Text>
      ) : expenses.length === 0 ? (
        <Text c="gray">No expenses yet.</Text>
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th ta="right">Amount</Table.Th>
              <Table.Th>Rate</Table.Th>
              <Table.Th ta="right">RON</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {expenses.map((expense) => (
              <Table.Tr
                key={expense.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setEditing(expense)}
              >
                <Table.Td>{formatDate(expense.date)}</Table.Td>
                <Table.Td>
                  {/* A button too, so the row can be opened from the keyboard. */}
                  <Anchor component="button" type="button" c="inherit">
                    {expense.description}
                  </Anchor>
                </Table.Td>
                <Table.Td>{categories[expense.category]}</Table.Td>
                <Table.Td ta="right">{formatAmount(expense.amount, expense.currency)}</Table.Td>
                <Table.Td>
                  <Rate expense={expense} />
                </Table.Td>
                <Table.Td ta="right">{formatRon(expense.amount_ron)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
          {summary && (
            <Table.Tfoot>
              <Table.Tr>
                <Table.Th colSpan={5} ta="right">
                  Total
                </Table.Th>
                <Table.Th ta="right">{formatRon(summary.spent)}</Table.Th>
              </Table.Tr>
            </Table.Tfoot>
          )}
        </Table>
      )}
      <ExpenseModal
        trip={trip}
        opened={editing !== undefined}
        expense={editing ?? null}
        onClose={() => setEditing(undefined)}
      />
    </section>
  );
}
