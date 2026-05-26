#!/bin/bash
set -e

echo "🚀 Starting IDCH Suite setup..."

# 0. Enforce Environment Configuration
if [ ! -f portal/.env.local ]; then
    cp portal/.env.example portal/.env.local
    echo "⚠️  CRITICAL ACTION REQUIRED ⚠️"
    echo "We detected a fresh installation. A default portal/.env.local file has been created."
    echo "Please open 'portal/.env.local' and edit 'PUBLIC_BASE_URL' to match your VPS Public IP or Domain."
    echo "Once you have edited the file, run this setup script again."
    exit 1
fi

# Load variables for Nextcloud config later
source portal/.env.local

# 1. Start Docker containers
echo "📦 Starting Docker containers (Nextcloud, Keycloak, Postgres)..."
docker compose up -d

echo "⏳ Waiting for Nextcloud to initialize (this may take 1-3 minutes)..."

# Poll until Nextcloud is fully installed
until docker exec -u www-data workspace_nextcloud php occ status | grep -q "installed: true"; do
  echo "Still installing... waiting 10 seconds..."
  sleep 10
done

echo "✅ Nextcloud is fully installed!"

# 2. Configure Nextcloud (Timezone, Language, Trusted Domains)
echo "⚙️ Configuring Nextcloud settings..."
docker exec -u www-data workspace_nextcloud php occ config:system:set default_timezone --value="Asia/Jakarta" || true
docker exec -u www-data workspace_nextcloud php occ config:system:set default_language --value="en" || true

# Extract IP/Domain from PUBLIC_BASE_URL (removing http:// and ports)
PUBLIC_IP=$(echo $PUBLIC_BASE_URL | sed -e 's|^[^/]*//||' -e 's|/.*$||' -e 's|:.*||')

echo "🔒 Setting Nextcloud Trusted Domains..."
docker exec -u www-data workspace_nextcloud php occ config:system:set trusted_domains 0 --value="localhost" || true
docker exec -u www-data workspace_nextcloud php occ config:system:set trusted_domains 1 --value="workspace_nextcloud" || true
if [ ! -z "$PUBLIC_IP" ]; then
    docker exec -u www-data workspace_nextcloud php occ config:system:set trusted_domains 2 --value="$PUBLIC_IP" || true
fi

# 3. Setup Portal environment variables
echo "📝 Skipping portal/.env.local creation (already exists and configured)..."

# 4. Install npm dependencies inside Docker
echo "📦 Installing Portal dependencies via Docker..."
docker compose run --rm portal npm install

# Restart the portal container in case it crashed earlier without node_modules
docker compose restart portal

echo "✅ Setup complete! The IDCH Portal is now running in Docker."
echo "   (Access the portal at http://localhost:3000)"
