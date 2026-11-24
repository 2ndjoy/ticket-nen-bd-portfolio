# Ticket Nen BD

Ticket Nen BD is a portfolio edition of my Bangladeshi event-ticketing capstone. A visitor can follow one event from an organiser's draft to an admin's approval and a buyer's QR ticket. The public catalogue starts with six fictional events, including Frames of Sylhet, Dhaka After Hours and Chattogram Food Stories.

## Try the three roles

Open **Demo sign-in**, choose a role to fill the form and select **Sign in**. These credentials are public demo accounts.

| Dashboard | Email | Password | Try this |
| --- | --- | --- | --- |
| Buyer | `buyer@demo.ticketnen.example` | `BrowseTickets27!` | Reserve tickets and open the QR code in the ticket wallet. |
| Organiser | `organiser@demo.ticketnen.example` | `HostEvents27!` | Create a draft for Bengal Sessions and check reservations against capacity. |
| Admin | `admin@demo.ticketnen.example` | `ReviewEvents27!` | Review the programme and change an event's visibility. |

### A three-minute walkthrough

1. Sign in as the organiser. In **Organiser studio**, choose **Add event**, set a future date and save the draft.
2. Sign out, then sign in as admin in the same browser. In **Admin overview**, edit your event, choose **Published** and save.
3. Sign out and sign in as the buyer. Open **Events**, find your event and reserve a ticket. In **Ticket wallet**, choose **View QR ticket**.
4. Return as the organiser to see the updated reservation count and value.

Each browser gets a separate copy of the programme at first sign-in. Visitors can switch roles to explore their own changes. Guest edits expire after approximately 24 hours. Sample reservations demonstrate the booking flow without charging cards or sending emails.

## Run locally

The app serves a React frontend and an Express API. MongoDB stores the programme, reservations and demo sessions in the dedicated `ticketnen_portfolio_demo` database.

### With Docker

From the repository root, run:

```sh
docker compose up --build
```

Open [the local demo](http://localhost:5000). The database uses a named volume. Run `docker compose down` to stop both services.

### With Node and MongoDB

Install Node.js 22 and start a local MongoDB service, or configure a dedicated MongoDB Atlas user with read and write access to `ticketnen_portfolio_demo`. From the repository root in PowerShell:

```powershell
npm ci --prefix client
npm ci --prefix server
Copy-Item server/.env.example server/.env
```

Set `DEMO_MONGODB_URI` in `server/.env` if using Atlas. The example points to local MongoDB. Build the frontend, seed the catalogue and start the server:

```powershell
npm run build --prefix client
npm run seed:demo --prefix server
npm start --prefix server
```

Open [the local demo](http://localhost:5000). For frontend development, keep the API running and run `npm start --prefix client` in a second terminal. The development server opens on port 3000 and proxies API requests to port 5000.

The server seeds the catalogue on first start. Repeating the seed preserves the programme while all six events are upcoming. Once an event date passes, the server refreshes the dates for new visitors. To customise the baseline for a fresh demo database, edit `server/demo/catalogue.js`.

## Check the application

```sh
npm test --prefix server
npm test --prefix client -- --watchAll=false --runInBand
npm run build --prefix client
```

The server tests cover role permissions, reservations, capacity and privacy between browser sessions. Visit `/api/health` on a running service to check its database connection.

With the local demo running on port 5000, run the Playwright walkthroughs in a second terminal:

```sh
cd e2e
npm ci
npx playwright install chromium
npm test
```

GitHub Actions runs the server tests, React test, production build and Playwright tests with a temporary MongoDB service on pull requests and pushes to `main`. Render is configured to deploy after passing checks on its linked branch.

## Track work in GitHub

Create a GitHub Projects board with **Backlog**, **Ready**, **In progress**, **In review** and **Done**. Start one issue per change using the **Portfolio task** template. Move it to **In progress** when opening a branch. Link the pull request to the issue with `Closes #123`, using its actual number. Move the issue to **In review** when the PR is ready. Close it after the change passes review and merges.

## Publish the portfolio site

1. Push this edition into the GitHub repository for the portfolio update.
2. In Render, create a Blueprint connected to that repository. The included `render.yaml` defines one free web service for the frontend and API.
3. Set `DEMO_MONGODB_URI` in the hosting dashboard and allow the service's outbound IP addresses in the demo Atlas project's network settings.
4. Deploy, open `/api/health` and confirm it returns `{"status":"ready"}`. In a fresh browser, complete the three-role walkthrough above.
5. Add the verified HTTPS address here, in the GitHub repository's **Website** field and on the CV.

The React entry point is `client/src/demo/Portal.js`. The dashboard views are in `client/src/demo/Dashboards.js`. The public API and session handling are in `server/demo/start.js`. Earlier capstone screens and backend modules remain in the source tree for reference.
