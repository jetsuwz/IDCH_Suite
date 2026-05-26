# IDCH Suite

A comprehensive internal portal integrated with Nextcloud Calendar via CalDAV.

## Features
- **Next.js Frontend:** A modern, fast dashboard tailored for IDCH operations.
- **Custom Calendar Popovers:** Features Nextcloud-style interactive modals and date pickers.
- **Nextcloud Integration:** Syncs seamlessly with Nextcloud CalDAV (bidirectional event syncing).
- **Timezone Aware:** Fully configured for local Indonesia timezone (`Asia/Jakarta`).

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)

## Getting Started (Quick Setup)

We have provided a convenient setup script that automates starting the Docker containers, configuring Nextcloud, copying environment files, and installing dependencies.

1. **Run the Setup Script**
   ```bash
   ./setup.sh
   ```
   *Note: If you get a permission error, run `chmod +x setup.sh` first.*

2. **Start the Frontend Portal**
   ```bash
   cd portal
   npm run dev
   ```

3. **Access the Application**
   - Portal: [http://localhost:3000](http://localhost:3000)
   - Nextcloud: [http://localhost:8080](http://localhost:8080) (Login: admin / admin)

## Manual Setup

If you prefer to set up the project manually or step-by-step:

1. **Start Backend Infrastructure**
   ```bash
   docker compose up -d
   ```
2. **Configure Nextcloud Timezone & Language**
   ```bash
   docker exec -u www-data workspace_nextcloud php occ config:system:set default_timezone --value="Asia/Jakarta"
   docker exec -u www-data workspace_nextcloud php occ config:system:set default_language --value="en"
   docker exec -u www-data workspace_nextcloud php occ config:system:set trusted_domains 1 --value="localhost"
   ```
3. **Configure Frontend Environment**
   ```bash
   cd portal
   cp .env.example .env.local
   ```
4. **Install Dependencies & Run**
   ```bash
   npm install
   npm run dev
   ```
