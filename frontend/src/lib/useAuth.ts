'use client';

import { useState, useEffect } from 'react';
import { nhost } from './nhost';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = nhost.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          setUserId(session.user.id);
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const unsubscribe = nhost.auth.onAuthStateChanged((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserId(null);
      }
      setIsLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return { isAuthenticated, isLoading, userId };
}
