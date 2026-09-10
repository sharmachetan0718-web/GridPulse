# GridPulse

GridPulse is a hackathon-ready carbon-aware EV fleet charging demo.

## Run locally

```bash
npm install
npm run dev
```

Open the localhost address printed by Vite.

## Demo flow

1. Create an operator account with any email and a password of 4+ characters.
2. No email verification is required.
3. The demo automatically creates 25 EVs, 10 chargers and charging history in the browser.
4. Open **Overview** to see fleet readiness and grid conditions.
5. Open **Optimization** and run **Optimize charging**.
6. Compare the uncontrolled and optimized schedules in **Schedule** and the impact in **Analytics**.
7. Use **Grid Intelligence** to explain why some hours are better for charging.

## Architecture

- React + Vite + TanStack Router
- Deterministic charging optimizer
- Browser-local demo authentication and data storage
- Simulated grid conditions, clearly labelled as simulation data
- Recharts for operational analytics

This local authentication is intentionally designed for a hackathon demonstration. It is not a production authentication system.
