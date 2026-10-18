import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';

/** `GET /api/auth/me/`: anyone signed in is the author; everyone else is a visitor. */
export interface CurrentUser {
  is_author: boolean;
  username: string | null;
}

export interface Credentials {
  username: string;
  password: string;
}

const currentUserKey = ['auth', 'me'] as const;

const visitor: CurrentUser = { is_author: false, username: null };

/** Store who is signed in, then reload everything else, since drafts and budgets depend on it. */
function switchUser(queryClient: QueryClient, user: CurrentUser) {
  queryClient.setQueryData(currentUserKey, user);
  void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: () => api.get<CurrentUser>('/auth/me/'),
    staleTime: Infinity,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: Credentials) => {
      // The sign-in request needs the CSRF cookie, which a first visit does not have yet.
      await api.get('/auth/csrf/');
      return api.post<CurrentUser>('/auth/login/', credentials);
    },
    onSuccess: (user) => switchUser(queryClient, user),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<undefined>('/auth/logout/'),
    onSuccess: () => switchUser(queryClient, visitor),
  });
}
