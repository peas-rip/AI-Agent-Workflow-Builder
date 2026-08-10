import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { HASURA_ENDPOINT } from './nhost';

const httpLink = new HttpLink({
  uri: HASURA_ENDPOINT,
  headers: {
    'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET || '',
  },
});

const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(
      createClient({
        url: HASURA_ENDPOINT.replace('http', 'ws'),
        connectionParams: () => ({
          headers: {
            'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET || '',
          },
        }),
      })
    )
  : null;

const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink
    )
  : httpLink;

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
