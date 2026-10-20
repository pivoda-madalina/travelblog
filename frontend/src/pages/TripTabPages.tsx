import { Text } from '@mantine/core';

export { BudgetTab } from '../features/budget/BudgetTab';
export { JournalTab } from '../features/journal/JournalTab';
export { RouteTab } from '../features/places/RouteTab';

/** Placeholders for the trip page tabs until their stories land. */
function ComingSoon({ story }: { story: string }) {
  return <Text c="gray">Coming soon ({story}).</Text>;
}

export function PhotosTab() {
  return <ComingSoon story="US-08" />;
}
