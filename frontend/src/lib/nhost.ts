import { createClient } from '@nhost/nhost-js';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local';
const region = process.env.NEXT_PUBLIC_NHOST_REGION || 'local';

// For cloud deployments, use the nhost.run domain
// For local development, use the local nhost CLI
const isCloud = subdomain !== 'local' && region !== 'local';

export const nhost = createClient({
  subdomain,
  region,
});

export const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_ENDPOINT || 
  (isCloud 
    ? `https://${subdomain}.hasura.${region}.nhost.run/v1/graphql`
    : 'http://localhost:8080/v1/graphql'
  );

// Export cloud-specific URLs for functions
export const NHOST_CLOUD_URL = isCloud 
  ? `https://${subdomain}.functions.${region}.nhost.run`
  : 'http://localhost:3001';
