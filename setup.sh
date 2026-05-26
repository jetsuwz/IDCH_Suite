#!/bin/bash
set -e

echo "🚀 Starting IDCH Suite setup..."

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
docker exec -u www-data workspace_nextcloud php occ config:system:set trusted_domains 1 --value="localhost" || true

# 3. Setup Portal environment variables
echo "📝 Setting up Portal frontend..."
if [ ! -f portal/.env.local ]; then
    cp portal/.env.example portal/.env.local
    echo "✅ Created portal/.env.local from example"
fi

# 4. Install npm dependencies inside Docker
echo "📦 Installing Portal dependencies via Docker..."
docker compose run --rm portal npm install

# Restart the portal container in case it crashed earlier without node_modules
docker compose restart portal

echo "✅ Setup complete! The IDCH Portal is now running in Docker."
echo "   (Access the portal at http://localhost:3000)"
