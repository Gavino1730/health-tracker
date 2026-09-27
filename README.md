# Health Tracker

A privacy-conscious personal health dashboard for recording routines, trends, and reflections, with optional AI-assisted summaries.

## Capabilities

- Tracks personal health information and trends in a React dashboard
- Uses a local Express API with PostgreSQL storage
- Offers optional AI features through the OpenAI Responses API

## Tech stack

React, Create React App, Express, PostgreSQL, Recharts, and optional OpenAI integration.

## Run locally

```powershell
npm install
npm run server

# In a second terminal
npm start
```

The dashboard opens at `http://localhost:3000` and expects the API at `http://localhost:3001`.

## Configuration

Create a local `.env` file with:

```text
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
OPENAI_MODEL=...
```

`OPENAI_API_KEY` is needed only for AI features. Never commit real health data, credentials, or database backups.

## Status

Personal project prepared for local development. It is not medical software and does not provide medical advice.
