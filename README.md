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

2. **Access the Application**
   - Portal: [http://localhost:3000](http://localhost:3000) (Runs automatically inside Docker)
   - Nextcloud: [http://localhost:8081](http://localhost:8081) (Login: admin / admin)

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
4. **Install Dependencies & Restart Portal**
   ```bash
   docker compose run --rm portal npm install
   docker compose restart portal
   ```

## Detailed Application Setup Guides

Since Docker creates a fresh, empty state for Keycloak and Nextcloud upon the first initialization, you must manually configure them so the Next.js Portal can communicate with them.

### 1. Keycloak Setup (SSO Authentication)
The Next.js Portal relies on Keycloak for login via NextAuth. You need to create a realm, a client, and a test user.

1. Open Keycloak Admin Console: [http://localhost:8080](http://localhost:8080)
2. Login with username `admin` and password `admin`.
3. **Create Realm**:
   - Click the dropdown in the top left corner (currently "master") and click **Create Realm**.
   - Set Realm name to `workspace` and click **Create**.
4. **Create Client**:
   - Go to **Clients** > **Create client**.
   - Client type: `OpenID Connect`.
   - Client ID: `portal-client` (must match your `.env.local`).
   - Click **Next**.
   - Toggle **Client authentication** to **ON**.
   - Toggle **Authorization** to **ON**.
   - Click **Next**.
   - Valid redirect URIs: `http://localhost:3000/api/auth/callback/keycloak`
   - Web origins: `http://localhost:3000`
   - Click **Save**.
5. **Get Client Secret**:
   - Go to the **Credentials** tab inside your new `portal-client`.
   - Copy the **Client Secret** and paste it into your `portal/.env.local` file under `KEYCLOAK_CLIENT_SECRET`.
6. **Create a User**:
   - Go to **Users** > **Add user**.
   - Username: `admin`
   - Email: `admin@example.com`
   - Click **Create**.
   - Go to the **Credentials** tab for that user, click **Set password**, enter `admin` (or any password), toggle "Temporary" to **OFF**, and click **Save**.

### 2. Nextcloud Setup (Calendar Backend)
The Portal uses Nextcloud's CalDAV API to fetch and manage events.

1. Open Nextcloud: [http://localhost:8081](http://localhost:8081)
2. Login with username `admin` and password `admin`.
3. **Enable Calendar App**:
   - Click on your Profile icon (top right) > **Apps**.
   - Search for **Calendar** and click **Download and enable**.
4. **Verify CalDAV URL**:
   - Open the Calendar app from the top navigation bar.
   - Click **Calendar settings & import** (bottom left).
   - Your primary CalDAV URL should be active. The Portal expects the endpoint at `/remote.php/dav/calendars/admin/personal/`.
5. **Create your first event**:
   - Click anywhere on the Nextcloud calendar grid to create a dummy event so the portal has data to fetch.

### 3. Odoo Setup (Optional)
If you plan to use Odoo for ERP features:
1. Open Odoo: [http://localhost:8069](http://localhost:8069)
2. Follow the database initialization wizard using PostgreSQL credentials (`postgres` / `adminpassword`).
