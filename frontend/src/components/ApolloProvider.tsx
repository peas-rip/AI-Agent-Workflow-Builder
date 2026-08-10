'use client';

import { ApolloProvider as ApolloAuthProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApolloAuthProvider client={apolloClient}>
      {children}
    </ApolloAuthProvider>
  );
}
