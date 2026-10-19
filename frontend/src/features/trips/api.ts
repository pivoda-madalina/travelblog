import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';

export type TripStatus = 'draft' | 'published';

/** `GET /api/trips/{id}/`. `planned_budget` is only sent to the author (BR-14). */
export interface Trip {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  summary: string;
  cover_photo: string | null;
  status: TripStatus;
  planned_budget?: string | null;
  created_at: string;
}

export interface TripInput {
  title: string;
  start_date: string;
  end_date: string;
  summary: string;
  status: TripStatus;
  cover_photo: File | null;
}

export const tripKeys = {
  all: ['trips'] as const,
  detail: (id: string | number) => ['trips', String(id)] as const,
};

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => api.get<Trip>(`/trips/${id}/`),
  });
}

/** Multipart, so the cover photo travels with the other fields (US-01). Without a new file the
 * cover is left out, so an edit keeps the current one. */
function toFormData({ cover_photo, ...fields }: TripInput): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.append(name, value);
  }
  if (cover_photo) {
    form.append('cover_photo', cover_photo);
  }
  return form;
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trip: TripInput) => api.post<Trip>('/trips/', toFormData(trip)),
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(trip.id), trip);
      void queryClient.invalidateQueries({ queryKey: tripKeys.all, exact: true });
    },
  });
}

export function useUpdateTrip(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trip: TripInput) => api.patch<Trip>(`/trips/${id}/`, toFormData(trip)),
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(trip.id), trip);
      void queryClient.invalidateQueries({ queryKey: tripKeys.all, exact: true });
    },
  });
}

/** Deletes the trip and everything in it (BR-11). */
export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/trips/${id}/`),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: tripKeys.all, exact: true });
    },
  });
}
