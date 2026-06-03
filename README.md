# Smart Helper Auto-Assignment System

Beginner-friendly implementation using:
- `HTML`
- `CSS`
- `JavaScript` (Vanilla JS + Node.js)
- `SQLite` with normal SQL

## Features Implemented
- Detect helper live location using GPS (`PUT /api/helpers/:id/location`)
- Match helper skill with selected service type
- Filter only available helpers
- Assign nearest helper, tie-break by best rating
- Update helper status (`Available` / `Busy`)
- Auto reassign when helper rejects or gives no response
- Show message when no helper is available

## Project Structure
- `server.js` - Express backend and assignment logic
- `db.js` - SQLite connection and helper methods
- `schema.sql` - table creation SQL
- `seed.sql` - sample data
- `public/index.html` - UI
- `public/styles.css` - styling
- `public/app.js` - frontend logic

## Setup
1. Install dependencies:
```bash
npm install
```

2. Start server:
```bash
npm start
```

3. Open in browser:
```text
http://localhost:3000
```

## How Assignment Works
1. User books a service with service type + location.
2. System finds helpers where:
   - skill matches service type
   - status is `Available`
3. System computes nearest helper using GPS distance formula.
4. If distance is same, higher-rated helper is chosen.
5. If selected helper response is `rejected` or `no_response`, system auto tries next best helper.
6. If no helper left, system returns `NO_HELPER_AVAILABLE`.

## Demo Controls in UI
- Set helper as `Available` or `Busy`
- Change auto response to `accepted`, `rejected`, `no_response`
- Move helper location (simulate live GPS updates)
