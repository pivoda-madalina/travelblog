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
  const queryClient = useQueryClient();
  const entriesChanged = useEntriesChanged(tripId);
  return useMutation({
    mutationFn: (entryId: number) => api.delete(`/journal-entries/${entryId}/`),
    // The entry's photos are deleted with it (BR-11).
    onSuccess: () =>
      Promise.all([
        entriesChanged(),
        queryClient.invalidateQueries({ queryKey: photoKeys.list(tripId) }),
      ]),
  });
}

/** `GET /api/photos/?trip={id}`, in upload order. `thumbnail` is the smaller copy for galleries
 * (US-08). */
export interface Photo {
  id: number;
  trip: number;
  journal_entry: number | null;
  image: string;
  thumbnail: string;
  caption: string;
  created_at: string;
}

export interface PhotoInput {
  image: File;
  caption: string;
  journal_entry: number | null;
}

export const photoKeys = {
  list: (tripId: number) => ['photos', tripId] as const,
};

export function usePhotos(tripId: number) {
  return useQuery({
    queryKey: photoKeys.list(tripId),
    queryFn: () => api.get<Photo[]>(`/photos/?trip=${tripId}`),
  });
}

/** One photo per request, so each file is accepted or refused on its own. The gallery is
 * refreshed by the caller once the batch is done. */
export function useUploadPhoto(tripId: number) {
  return useMutation({
    mutationFn: ({ image, caption, journal_entry }: PhotoInput) => {
      const form = new FormData();
      form.append('trip', String(tripId));
      form.append('image', image);
      form.append('caption', caption);
      if (journal_entry !== null) {
        form.append('journal_entry', String(journal_entry));
      }
      return api.post<Photo>('/photos/', form);
    },
  });
}

export function usePhotosChanged(tripId: number) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: photoKeys.list(tripId) });
}
