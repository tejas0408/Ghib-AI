# Ghib AI

Ghib AI is a Next.js image transformation workstation. Users can upload a source image, choose a visual style, generate a modified image with OpenAI image models, and keep a private history of generated outputs.

## Features

- Credentials-based authentication with bcrypt password hashing.
- JWT sessions stored in HTTP-only cookies, backed by database session records.
- Protected dashboard, generation, history, and account pages.
- Image upload and generated image storage through ImageKit.
- OpenAI image editing for uploaded-image transformations.
- Style presets for anime cel art, clay render, marble sculpture, pixel art, and storybook illustration.
- Generation history, image download, copy URL, fullscreen preview, and delete actions.

## Tech Stack

- Next.js 15 and React 19
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Neon PostgreSQL
- OpenAI image APIs
- ImageKit
- bcryptjs

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local `.env` file with the required values:

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="at-least-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

OPENAI_API_KEY="sk-..."

IMAGEKIT_PUBLIC_KEY="public_..."
IMAGEKIT_PRIVATE_KEY="private_..."
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/..."
```

`OPEN_AI_API_KEY` is also supported as a fallback for the OpenAI key.

Apply database migrations:

```bash
npx drizzle-kit migrate
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev        # Start local development server
npm run build      # Build for production
npm run start      # Start production server
npm run typecheck  # Run TypeScript checks
```

## Authentication

Authentication is implemented in the app without Better Auth. Registration and login create a database session and sign a JWT into the `ghib_session` HTTP-only cookie. Middleware performs fast stateless JWT checks for protected routes, while server components, server actions, and API routes also verify the active session in PostgreSQL.

Key files:

- `src/actions/auth.ts`
- `src/lib/auth-server.ts`
- `src/lib/jwt.ts`
- `src/middleware.ts`

## Image Generation Flow

1. The user uploads a source image.
2. The file is stored in ImageKit under the authenticated user's folder.
3. The selected style preset builds the transformation prompt.
4. The server sends the source image and prompt to OpenAI image editing.
5. The returned image is uploaded to ImageKit.
6. The generation record is saved in PostgreSQL and shown in history.

Key files:

- `src/components/Generate/GenerateForm.tsx`
- `src/app/api/generate/route.ts`
- `src/lib/services/generation.ts`
- `src/lib/presets-config.ts`
- `src/lib/imagekit.ts`

## Database

The schema lives in `src/db/schema.ts`. Migrations live in `migrations/`.

Main tables:

- `users`
- `sessions`
- `generations`
- `renders`
- `accounts`
- `verification_tokens`

The `accounts` and `verification_tokens` tables are retained for compatibility with historical auth schema mappings, but active authentication uses the custom credentials and session flow.

## Environment Notes

Production requires:

- A strong `JWT_SECRET` with at least 32 characters.
- HTTPS so secure cookies can be enforced.
- A valid Neon PostgreSQL connection string.
- OpenAI API access to the configured image model.
- ImageKit public key, private key, and URL endpoint.

## Project Structure

```text
src/
  actions/              Server actions for auth and generation
  app/                  Next.js App Router pages and API routes
  components/           UI and feature components
  db/                   Drizzle database schema and client
  hooks/                Client hooks
  lib/                  Auth, generation, provider, storage, and utility modules
public/                 Static assets, videos, and image frame sequences
migrations/             Drizzle SQL migrations and metadata
```
