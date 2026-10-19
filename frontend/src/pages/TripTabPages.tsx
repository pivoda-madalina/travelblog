import { Text } from '@mantine/core';

export { BudgetTab } from '../features/budget/BudgetTab';
export { RouteTab } from '../features/places/RouteTab';

/** Placeholders for the trip page tabs until their stories land. */
function ComingSoon({ story }: { story: string }) {
  return <Text c="gray">Coming soon ({story}).</Text>;
}

export function JournalTab() {
  return <ComingSoon story="US-07" />;
}

export function PhotosTab() {
  return <ComingSoon story="US-08" />;
}
