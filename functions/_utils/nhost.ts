import { createClient } from '@nhost/nhost-js';

const nhost = createClient({
  subdomain: process.env.NHOST_SUBDOMAIN || 'local',
  region: process.env.NHOST_REGION || 'local',
});

export default nhost;
