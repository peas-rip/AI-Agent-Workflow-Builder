#!/bin/bash

# Deployment script for Nhost Cloud
# Usage: ./deploy.sh <subdomain>

set -e

SUBDOMAIN=$1

if [ -z "$SUBDOMAIN" ]; then
  echo "Usage: ./deploy.sh <nhost-project-subdomain>"
  echo "Example: ./deploy.sh abcdefghijklmnop"
  exit 1
fi

echo "Deploying to Nhost Cloud: $SUBDOMAIN"

# Check if nhost CLI is installed
if ! command -v nhost &> /dev/null; then
  echo "Nhost CLI not found. Installing..."
  npm install -D @nhost/cli
fi

# Login to Nhost (if not already logged in)
echo "Logging in to Nhost..."
nhost login

# Push functions and metadata to cloud
echo "Pushing to cloud..."
nhost push --subdomain $SUBDOMAIN

echo "Deployment complete!"
echo ""
echo "Your Nhost project URLs:"
echo "  Dashboard: https://$SUBDOMAIN.dashboard.nhost.run"
echo "  GraphQL:   https://$SUBDOMAIN.hasura.nhost.run/v1/graphql"
echo "  Auth:      https://$SUBDOMAIN.auth.nhost.run"
echo "  Storage:   https://$SUBDOMAIN.storage.nhost.run"
echo "  Functions: https://$SUBDOMAIN.functions.nhost.run"
