# Ticket Nen BD

[**Open the live demo**](https://ticket-nen-bd-demo.onrender.com/) · [View CI runs](https://github.com/2ndjoy/ticket-nen-bd-portfolio/actions/workflows/ci.yml)

Ticket Nen BD is an event-ticketing platform for Bangladesh that I originally built as my computer science capstone. This portfolio edition follows an event from an organiser’s first draft through admin approval to a buyer’s downloadable QR ticket.

The public catalogue starts with six fictional events, including *Frames of Sylhet*, *Dhaka After Hours* and *Chattogram Food Stories*.

## Try the demo

Open the live site, select **Demo sign-in**, choose a role and click **Sign in**. Choosing a role fills in its credentials automatically.

| Role | Demo email | Demo password | What you can try |
| --- | --- | --- | --- |
| Buyer | `buyer@demo.ticketnen.example` | `BrowseTickets27!` | Browse events, reserve tickets and download a PDF with a QR code. |
| Organiser | `organiser@demo.ticketnen.example` | `HostEvents27!` | Create drafts, edit or delete Bengal Sessions events and track reservations. |
| Admin | `admin@demo.ticketnen.example` | `ReviewEvents27!` | Review drafts, publish or unpublish events and delete events from any organiser. |

**For a quick look**, sign in as **Buyer**, open **Ticket wallet** and select **Download PDF** on the sample reservation.

### Follow one event through all three roles

Use the same browser for these steps so each role sees the changes you make.

1. **Create an event.** Sign in as **Organiser**. In **Organiser studio**, select **Add event**, enter a title, city, future start time, capacity and ticket price, then save the draft.
2. **Publish it.** Sign out and sign in as **Admin**. Find your event, select **Edit**, change its visibility to **Published** and save.
3. **Book a ticket.** Switch to **Buyer**, open **Events**, find your event and reserve a ticket. In **Ticket wallet**, select **Download PDF** to save the event details, QR code and reservation reference.
4. **Check the result.** Switch back to **Organiser**. Your dashboard shows the updated ticket count and reservation value.
5. **Try a cancellation.** Delete the event as its organiser. It disappears from the catalogue. The buyer keeps a record in their wallet, and a newly downloaded PDF shows that the event was cancelled.

Each browser gets its own copy of the demo catalogue at first sign-in. You can experiment without changing another visitor’s experience. Demo sessions expire after approximately 24 hours. All reservations are fictional and no payment is collected.

## Technology and delivery

| Area | Implementation |
| --- | --- |
| Frontend | React and React Router power the event catalogue and three role-based dashboards. |
| Backend | Node.js and Express serve the API and enforce booking, event ownership and role permissions. |
| Database | MongoDB stores the catalogue, reservations and demo sessions. The hosted app uses MongoDB Atlas. |
| Local development | Docker Compose starts the application and MongoDB together. |
| Testing | Node.js tests cover the API and booking rules. React Testing Library checks the sign-in interface. Playwright tests the main user journeys in Chromium. |
| CI/CD | GitHub Actions runs tests and builds the frontend. Render is configured to deploy from `main` after the checks pass. |
| Project tracking | GitHub Issues, a Kanban board, feature branches and pull requests track changes from development through release. |

## Run locally with Docker

With Docker running, clone the repository and start the application:

```sh
git clone https://github.com/2ndjoy/ticket-nen-bd-portfolio.git
cd ticket-nen-bd-portfolio
docker compose up -d --build
```

Open [the local website](http://localhost:5000). On first startup, the server creates the six demo events and sample reservations. MongoDB uses a named volume so the data persists when you stop the containers.

To stop the application:

```sh
docker compose down
```

## Run locally with Node.js

Use Node.js 22 and either a local MongoDB service or a MongoDB Atlas database user with read/write access to `ticketnen_portfolio_demo`.

From the repository root, run these commands in PowerShell:

```powershell
npm ci --prefix client
npm ci --prefix server
Copy-Item server/.env.example server/.env
```

The example configuration points to local MongoDB. To use Atlas, set `DEMO_MONGODB_URI` in `server/.env` to your connection string.

```powershell
npm run build --prefix client
npm run seed:demo --prefix server
npm start --prefix server
```

Open [the local website](http://localhost:5000). For frontend development, keep the API running and run `npm start --prefix client` in a second terminal. The React development server opens on port 3000 and forwards API requests to port 5000.

## Automated checks

Run the backend tests, frontend test and production build from the repository root:

```sh
npm test --prefix server
npm test --prefix client -- --watchAll=false --runInBand
npm run build --prefix client
```

With the app running on port 5000, run the browser tests in a second terminal:

```sh
cd e2e
npm ci
npx playwright install chromium
npm test
```

The Playwright tests cover three journeys:

- Find an event by city and open its details.
- Create a draft, publish it, reserve a ticket and download the PDF.
- Delete events as an organiser and admin, then check the cancelled reservation in the buyer’s wallet.

GitHub Actions runs these checks on pull requests and pushes to `main`, using a temporary MongoDB service for the browser tests. The workflow is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Cloud deployment

The [Render Blueprint](render.yaml) defines one web service that serves both the React frontend and the Express API. Render receives the Atlas connection string through the `DEMO_MONGODB_URI` environment variable.

The `/api/health` endpoint checks the database connection. A healthy deployment returns:

```json
{"status":"ready"}
```

## Code guide

| Path | Purpose |
| --- | --- |
| [`client/src/demo/Portal.js`](client/src/demo/Portal.js) | Event catalogue, event details, sign-in and navigation |
| [`client/src/demo/Dashboards.js`](client/src/demo/Dashboards.js) | Buyer wallet, organiser studio and admin dashboard |
| [`server/demo/catalogue.js`](server/demo/catalogue.js) | Sample events, booking rules and event permissions |
| [`server/demo/start.js`](server/demo/start.js) | Express API, MongoDB connection and session handling |
| [`server/utils/ticketPdf.js`](server/utils/ticketPdf.js) | Downloadable PDF tickets with QR codes |
| [`e2e/tests/demo.spec.js`](e2e/tests/demo.spec.js) | Playwright browser tests |
