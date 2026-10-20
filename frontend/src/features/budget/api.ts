import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';

/** `GET /api/expenses/?trip={id}`, by date. Money and rates are decimal strings. */
export interface Expense {
  id: number;
  trip: number;
  date: string;
  description: string;
  category: Category;
  amount: string;
  currency: string;
  rate: string;
  rate_source: 'nbr' | 'manual';
  amount_ron: string;
}

/** An empty rate asks the API for the NBR rate of the expense date. */
export interface ExpenseInput {
  date: string;
  description: string;
  category: Category;
  amount: string;
  currency: string;
  rate: string | null;
}

/** The fixed list of expense categories (BR-08). */
export const categories = {
  transport: 'Transport',
  accommodation: 'Accommodation',
  food_and_drinks: 'Food and drinks',
  activities: 'Activities',
  shopping: 'Shopping',
  other: 'Other',
} as const;

export type Category = keyof typeof categories;

export const categoryOptions = Object.entries(categories).map(([value, label]) => ({
  value,
  label,
}));

export const expenseKeys = {
  list: (tripId: number) => ['expenses', tripId] as const,
};

export function useExpenses(tripId: number) {
  return useQuery({
    queryKey: expenseKeys.list(tripId),
    queryFn: () => api.get<Expense[]>(`/expenses/?trip=${tripId}`),
  });
}

function useExpensesChanged(tripId: number) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: expenseKeys.list(tripId) });
}

export function useAddExpense(tripId: number) {
  const expensesChanged = useExpensesChanged(tripId);
  return useMutation({
    mutationFn: (expense: ExpenseInput) =>
      api.post<Expense>('/expenses/', { ...expense, trip: tripId }),
    onSuccess: expensesChanged,
  });
}

export function useUpdateExpense(tripId: number) {
  const expensesChanged = useExpensesChanged(tripId);
  return useMutation({
    mutationFn: ({ id, ...expense }: ExpenseInput & { id: number }) =>
      api.patch<Expense>(`/expenses/${id}/`, expense),
    onSuccess: expensesChanged,
  });
}

export function useDeleteExpense(tripId: number) {
  const expensesChanged = useExpensesChanged(tripId);
  return useMutation({
    mutationFn: (expenseId: number) => api.delete(`/expenses/${expenseId}/`),
    onSuccess: expensesChanged,
  });
}
