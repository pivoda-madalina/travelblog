import { Card, Group, Progress, Stack, Text, Title } from '@mantine/core';

import { formatRon } from '../../lib/money';
import { type BudgetSummary, categories } from './api';

/** The Spent card of wireframe 6: every expense of the trip in RON (US-13, BR-01). */
export function SpentCard({ summary }: { summary: BudgetSummary }) {
  return (
    <Card withBorder padding="md">
      <Text size="sm" c="dimmed">
        Spent
      </Text>
      <Text size="xl" fw={600}>
        {formatRon(summary.spent)}
      </Text>
    </Card>
  );
}

/** Planned minus spent, red when spending is over the planned budget (US-13). */
export function DifferenceCard({ summary }: { summary: BudgetSummary }) {
  return (
    <Card withBorder padding="md">
      <Text size="sm" c="dimmed">
        Difference
      </Text>
      {summary.difference == null ? (
        <Text size="xl" fw={600}>
          Not set
        </Text>
      ) : (
        <Group gap="xs" align="baseline" wrap="nowrap">
          <Text size="xl" fw={600} c={summary.over_budget ? 'red' : undefined}>
            {formatRon(summary.difference)}
          </Text>
          {summary.over_budget && (
            <Text size="sm" c="red">
              over budget
            </Text>
          )}
        </Group>
      )}
    </Card>
  );
}

/** By category, largest first, each bar its share of the total spent (US-13). The bar width is
 * the only thing computed in floating point; the amounts stay decimal strings. */
export function CategoryTotals({ summary }: { summary: BudgetSummary }) {
  const total = Number(summary.spent);

  return (
    <section>
      <Title order={3} mb="sm">
        By category
      </Title>
      <Stack gap="xs">
        {summary.categories.map(({ category, spent }) => (
          <Group key={category} gap="md" wrap="nowrap">
            <Text w={140}>{categories[category]}</Text>
            <Progress
              value={total === 0 ? 0 : (Number(spent) / total) * 100}
              flex={1}
              size="lg"
              aria-label={categories[category]}
            />
            <Text w={140} ta="right">
              {formatRon(spent)}
            </Text>
          </Group>
        ))}
      </Stack>
    </section>
  );
}
