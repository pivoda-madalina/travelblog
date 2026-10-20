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

/** `GET /api/rates/`: the NBR rate for a currency and date, or the most recent earlier one
 * (`rate_date`). Without a rate, `detail` says why (BR-03, BR-04). */
export interface NbrRate {
  currency: string;
  date: string;
  rate: string | null;
  rate_date: string | null;
  detail: string;
}

/** The rate the API will use if the author leaves the rate empty (BR-02). Looked up once the
 * date and a full currency code other than RON are chosen. */
export function useNbrRate(currency: string, date: string | null) {
  return useQuery({
    queryKey: ['rates', currency, date],
    queryFn: () => api.get<NbrRate>(`/rates/?currency=${currency}&date=${date}`),
    enabled: date !== null && /^[A-Z]{3}$/.test(currency) && currency !== 'RON',
    staleTime: Infinity,
  });
}

export const expenseKeys = {
  list: (tripId: number) => ['expenses', tripId] as const,
};

/** `GET /api/trips/{id}/budget/`, in RON (US-13, BR-01). `difference` is planned minus spent,
 * negative when over budget; it and `planned` are null without a planned budget. Categories
 * come largest first, every one of them. */
export interface BudgetSummary {
  planned: string | null;
  spent: string;
  difference: string | null;
  over_budget: boolean;
  categories: { category: Category; spent: string }[];
}

export const budgetKeys = {
  summary: (tripId: number) => ['budget', tripId] as const,
};

export function useBudget(tripId: number) {
  return useQuery({
    queryKey: budgetKeys.summary(tripId),
    queryFn: () => api.get<BudgetSummary>(`/trips/${tripId}/budget/`),
  });
}

export function useExpenses(tripId: number) {
  return useQuery({
    queryKey: expenseKeys.list(tripId),
    queryFn: () => api.get<Expense[]>(`/expenses/?trip=${tripId}`),
  });
}

function useExpensesChanged(tripId: number) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expenseKeys.list(tripId) }),
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(tripId) }),
    ]);
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
