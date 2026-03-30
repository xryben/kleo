'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth(options?: { requiredRole?: string; redirect?: boolean }): AuthState {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('cleo_token');
    const role = localStorage.getItem('cleo_role');
    const shouldRedirect = options?.redirect !== false;

    if (!token) {
      setState({ token: null, role: null, isAuthenticated: false, isLoading: false });
      if (shouldRedirect) router.replace('/login');
      return;
    }

    if (options?.requiredRole && role !== options.requiredRole) {
      setState({ token, role, isAuthenticated: true, isLoading: false });
      if (shouldRedirect) router.replace('/login');
      return;
    }

    setState({ token, role, isAuthenticated: true, isLoading: false });
  }, [router, options?.requiredRole, options?.redirect]);

  return state;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cleo_token');
}

export function logout(router?: ReturnType<typeof useRouter>) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cleo_token');
  localStorage.removeItem('cleo_role');
  localStorage.removeItem('cleo_admin_token');
  if (router) {
    router.push('/login');
  } else {
    window.location.href = '/login';
  }
}
