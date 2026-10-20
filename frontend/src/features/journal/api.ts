import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';

/** `GET /api/journal-entries/?trip={id}`, by date. `body` is Markdown; `place_name` is the
 * linked place's city, or null without a place (US-07). */
export interface JournalEntry {
  id: number;
  trip: number;
  date: string;
  place: number | null;
  place_name: string | null;
  title: string;
  body: string;
}

export interface JournalEntryInput {
  date: string;
  place: number | null;
  title: string;
  body: string;
}

export const entryKeys = {
  list: (tripId: number) => ['journal-entries', tripId] as const,
};

export function useJournalEntries(tripId: number) {
  return useQuery({
    queryKey: entryKeys.list(tripId),
    queryFn: () => api.get<JournalEntry[]>(`/journal-entries/?trip=${tripId}`),
  });
}

function useEntriesChanged(tripId: number) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: entryKeys.list(tripId) });
}

export function useAddEntry(tripId: number) {
  const entriesChanged = useEntriesChanged(tripId);
  return useMutation({
    mutationFn: (entry: JournalEntryInput) =>
      api.post<JournalEntry>('/journal-entries/', { ...entry, trip: tripId }),
    onSuccess: entriesChanged,
  });
}

export function useUpdateEntry(tripId: number) {
  const entriesChanged = useEntriesChanged(tripId);
  return useMutation({
    mutationFn: ({ id, ...entry }: JournalEntryInput & { id: number }) =>
      api.patch<JournalEntry>(`/journal-entries/${id}/`, entry),
    onSuccess: entriesChanged,
  });
}

export function useDeleteEntry(tripId: number) {
  const entriesChanged = useEntriesChanged(tripId);
  return useMutation({
    mutationFn: (entryId: number) => api.delete(`/journal-entries/${entryId}/`),
    onSuccess: entriesChanged,
  });
}
