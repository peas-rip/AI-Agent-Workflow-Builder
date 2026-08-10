import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { nhost } from './nhost';

const NHOST_ENDPOINT = process.env.NEXT_PUBLIC_NHOST_ENDPOINT || 'https://rjxzoqtvtqbgjqcagviq.hasura.ap-south-1.nhost.run';
const NHOST_SUB_ENDPOINT = process.env.NEXT_PUBLIC_NHOST_SUB_ENDPOINT || 'wss://rjxzoqtvtqbgjqcagviq.hasura.ap-south-1.nhost.run/v1/graphql';

const authLink = new ApolloLink((operation, forward) => {
  const session = nhost.auth.getSession();
  const token = session?.session?.accessToken;

  operation.setContext({
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return forward(operation);
});

const httpLink = new HttpLink({
  uri: `${NHOST_ENDPOINT}/v1/graphql`,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: NHOST_SUB_ENDPOINT,
    connectionParams: () => {
      const session = nhost.auth.getSession();
      const token = session?.session?.accessToken;
      return {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
    },
  })
);

const splitLink = ApolloLink.split(
  ({ query }) => {
    const definition = query.definitions[0] as any;
    return definition?.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  ApolloLink.from([authLink, httpLink])
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
