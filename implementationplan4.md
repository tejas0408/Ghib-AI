# Architecture Audit & Refactoring Implementation Plan (Ghib AI)

This document provides a comprehensive audit and implementation plan to improve, standardize, and finalize the backend architecture of Ghib AI. It establishes a production-grade database schema, optimizes the storage layout and security, improves provider abstractions, and outlines a robust AI generation pipeline.

---

## 1. Database Architecture Review
The current database architecture uses PostgreSQL on Neon, connected via the `@neondatabase/serverless` HTTP driver and managed using Drizzle ORM. 

### Audit of Existing Tables:
1. **`users`**: Uses a `text` type for the primary key. This is standard for Better Auth integration. It is normalized, containing standard fields (`name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`). The email column is unique.
2. **`sessions`**: Includes basic metadata like `ipAddress` and `userAgent`. Has a cascade delete constraint targeting `users.id`, which is a best practice. Contains a custom index on `userId`.
3. **`accounts`**: Stores OAuth and credential authentication records. Correctly indexes `userId` and references `users.id` with a cascade delete.
4. **`verificationTokens`**: Stores single-use tokens for email validation or password resets.
5. **`renders`**: A legacy table currently storing generation outputs. It has limited parameters (only `id`, `userId`, `sourceImage`, `generatedImage`, `style`, and `createdAt`). It lacks status tracking (`pending`/`failed`), metadata (`width`, `height`, `fileSize`, `generationTime`), parameters storage, model specifications, or error messages.

### Normalization and Scalability Findings:
* **Missing Soft Deletes**: There is no soft delete support in the users or renders tables, which makes user deletion dangerous due to CASCADE rules on foreign keys.
* **String-based Identifiers**: Using string-based IDs (`id: text().primaryKey()`) generated via UUIDs or Better Auth identifiers is correct for serverless environments where sequential serial IDs can leak information and create concurrency bottlenecks.
* **Indices Coverage**: While `userId` is indexed on the tables, composite indexes for common queries (e.g. querying history sorted by creation date for a specific user) are missing.
* **Timestamp Consistency**: Some tables do not have an `updatedAt` field or automatic update triggers, which can cause out-of-sync state records.

---

## 2. Schema Audit Report

| Table Name | Strength / Best Practice | Weakness / Gaps | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | Proper constraints on email (unique, notNull). | No indexes on `createdAt` or `email` (relying on implicit unique index). | Low | Rely on unique constraint index for lookup, add explicit indexes if sorting users. |
| **`sessions`** | Index present on `userId`. Cascade delete is active. | Session tokens are not hashed (Better Auth default uses random high-entropy strings, but hashed tokens are safer). | Low | Ensure SSL is strictly enforced on connection (SSLMode is active in `.env`). |
| **`accounts`** | Index present on `userId`. Handles token expiration timestamps. | Long text fields (tokens) lack varchar size boundaries (standard text is fine in Pg, but has minor metadata overhead). | Very Low | Keep standard Postgres `text` to avoid truncation on long OAuth tokens. |
| **`verificationTokens`** | Simple and isolated. | No unique index on `(identifier, value)` composite. | Medium | Add composite index for lookup speed and constraints. |
| **`renders`** | Serves as a baseline history table. | Lacks crucial fields for pipeline safety: status, timing, dimensions, prompt metadata, provider, and parameters. | High | **Deprecate `renders`** in favor of a new, highly extensible `generations` table. |

---

## 3. Generations Table Design

To support a production-grade AI pipeline, the new `generations` table will handle long-running async transformations, audit trails for prompts, model details, image dimensions, and error logging.

### Fields and Descriptions:
* **`id`**: Unique string identifier (`gen_` prefixed UUIDv4 or nanoID).
* **`userId`**: References `users.id` with `onDelete: 'cascade'`.
* **`originalImageUrl`**: Source Image URL (ImageKit public URL or pre-signed URL).
* **`generatedImageUrl`**: The final output public URL (nullable during processing/failure).
* **`style`**: The requested aesthetic style. Extensible string slug (e.g. `anime`, `clay`, `marble`, `pixelart`, `storybook`).
* **`preset`**: The slug of the prompt preset template used (e.g., `anime-cel`, `clay-render`).
* **`promptUsed`**: The exact generated user/system prompt fed to the AI model.
* **`model`**: Name of the model configuration used (e.g., `dall-e-3`, `imagen-3`).
* **`generationStatus`**: State tracker representing: `pending` | `processing` | `completed` | `failed`.
* **`generationTime`**: Integer representing time elapsed in milliseconds.
* **`imageWidth` & `imageHeight`**: Output image resolution in pixels.
* **`fileSize`**: Output file size in bytes.
* **`errorMessage`**: Error logs or API messages if `generationStatus` becomes `failed`.
* **`provider`**: AI service provider name (e.g. `openai`, `replicate`, `fal`).
* **`parameters`**: JSONB column containing prompt weight parameters, aspect ratios, seeds, or provider-specific parameters.
* **`createdAt`**: Generation timestamp.
* **`updatedAt`**: Automatic update timestamp.

---

## 4. `db/generations.ts` Implementation Plan

Here is the complete implementation of the generations schema. This file should be placed under `src/db/generations.ts` or directly within `src/db/schema.ts` to keep all tables in a single module. To optimize modularity, we will design it as a standalone file `src/db/generations.ts`.

```typescript
import { pgTable, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './schema';

export const generationStatusEnum = ['pending', 'processing', 'completed', 'failed'] as const;
export type GenerationStatus = (typeof generationStatusEnum)[number];

export const generations = pgTable(
  'generations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalImageUrl: text('original_image_url').notNull(),
    generatedImageUrl: text('generated_image_url'),
    style: text('style').notNull(),
    preset: text('preset').notNull(),
    promptUsed: text('prompt_used').notNull(),
    model: text('model').notNull(),
    generationStatus: text('generation_status').$type<GenerationStatus>().default('pending').notNull(),
    generationTime: integer('generation_time'), // in milliseconds
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    fileSize: integer('file_size'), // in bytes
    errorMessage: text('error_message'),
    provider: text('provider').default('openai').notNull(),
    parameters: jsonb('parameters').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('generations_user_id_idx').on(table.userId),
    statusIdx: index('generations_status_idx').on(table.generationStatus),
    createdAtIdx: index('generations_created_at_idx').on(table.createdAt),
    // Composite index for fast history retrieval per user sorted by date
    userCreatedAtIdx: index('generations_user_created_at_idx').on(table.userId, table.createdAt),
  })
);
```

---

## 5. Drizzle Relations Plan

To make queries seamless using Drizzle's relational query API, we need to register relationships. We should place these in `src/db/schema.ts` or update the relations block.

### Modifying `src/db/schema.ts` relations:
```typescript
import { relations } from 'drizzle-orm';
import { generations } from './generations';

// Update user relations to include generations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  renders: many(renders), // Deprecated
  generations: many(generations), // New relationship
}));

// Add generations relations
export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id],
  }),
}));
```

---

## 6. Indexing Strategy
To guarantee fast query responses on Neon, the following indexing schema will be established:

1. **`generations_user_created_at_idx`**: 
   * **Columns**: `(user_id, created_at DESC)`
   * **Why**: The most common query is retrieving the current user's generation history sorted newest to oldest. A composite index satisfies this query completely without requiring a file sort operation.
2. **`generations_status_idx`**:
   * **Columns**: `(generation_status)`
   * **Why**: Crucial for background workers or pollers that check for stuck/pending tasks or aggregate error statistics.
3. **`generations_user_id_idx`**:
   * **Columns**: `(user_id)`
   * **Why**: Speeds up direct foreign key lookups and cascade deletions.

---

## 7. ImageKit Architecture Review
The file `src/lib/imagekit.ts` exposes a singleton client and an upload helper `uploadBufferToImageKit`.

### Critical Review Findings:
* **No Folder Organization**: Currently, uploads are dropped into whatever folder parameter is passed in, without structural enforcement.
* **No Size Validation**: Buffers are processed without checking size boundaries in the backend, raising the risk of high-memory exhaustion inside serverless routines.
* **Missing Cleanup Protocol**: There is no automatic script to delete temporary uploads. Users might upload files and cancel the generation, leaving "orphan" assets on ImageKit.
* **No Security Contexts**: The client uses the master private key directly. Client-side uploads are not utilized, which forces all files through Next.js server routines (increasing resource overhead).

### Recommended Storage Directory Structure:
We must organize ImageKit folders strictly to avoid file collisions and optimize file audits:
```
ghib-ai/
└── users/
    └── {userId}/
        ├── originals/    <-- Raw user uploads (source files)
        ├── generated/    <-- Completed AI style transformations
        └── temp/         <-- Temporary files queued for deletion checks
```

---

## 8. Storage Optimization Recommendations

1. **Direct-to-ImageKit Uploads (Client Signature)**:
   * Instead of uploading files to the Next.js server as form data, implement client-side uploading.
   * Expose an API endpoint `/api/storage/signature` that returns secure auth parameters (token, expire, signature).
   * The client uploads the file directly to ImageKit, which significantly reduces Next.js hosting bandwidth and function execution timeouts.
2. **Auto-Expiration for Temp/Original Images**:
   * Create an automated lifecycle rule within ImageKit (or run a nightly cron job via Upstash/Vercel) to scan `users/{userId}/originals/` and remove files older than 30 days. Only the premium outputs in `/generated` need long-term hosting.
3. **Optimized Transformation URLs**:
   * Utilize ImageKit's real-time image processing features. When rendering in the UI, append query transformations instead of retrieving full-resolution outputs.
   * Example: `https://ik.imagekit.io/project/path/image.jpg?tr=w-600,q-80,f-webp` (delivers compressed WebP instantly).

---

## 9. OpenAI Integration Audit
The current initialization in `src/lib/openai.ts` checks for `process.env.OPEN_AI_API_KEY` and exports `openaiProvider` using Vercel AI SDK wrapper: `createOpenAI({ apiKey })`.

### Audit Findings:
* **Provider Instantiation Safety**: If `OPEN_AI_API_KEY` is missing in development, the provider is exported as `null`. When `generateImage` uses the client without checks, it will throw a runtime exception.
* **Missing Timeouts**: Generative image APIs (DALL-E) can take up to 10–15 seconds to return a URL. The default fetch timeout in Next.js Server Actions is 15-30s. If OpenAI gets congested, the client request might hang indefinitely or fail silently.
* **No Resilience**: No retry patterns or exponential backoffs are configured. A temporary rate limit or standard HTTP 429 error will crash the pipeline.

### Refactored Initialization Plan:
```typescript
import { createOpenAI } from "@ai-sdk/openai";

const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: OpenAI API key is missing. AI operations will fail.");
}

export const openaiProvider = createOpenAI({
  apiKey: apiKey || "dummy-key",
  compatibility: "compatible",
  headers: {
    "X-App-Source": "Ghib-AI",
  }
});
```

---

## 10. Model Management Review
The model settings are defined in `src/lib/openai-image-models.ts` with labels pointing to placeholders `gpt-image-1` and `gpt-image-1.5`.

### Scalability Findings:
* **Improper Model Mapping**: OpenAI's actual image models are `dall-e-2` and `dall-e-3`. The placeholders (`gpt-image-*`) do not map to valid endpoints.
* **Hardcoded Provider**: The abstraction assumes OpenAI is the sole provider. Adding Google Imagen, Fal.ai, Replicate, or Runware would require rewriting the core generation logic.

### Recommended Model Provider Abstraction:
Introduce a unified interface `src/lib/providers-registry.ts` to easily switch model endpoints.

```typescript
export interface AIImageProvider {
  id: string;
  name: string;
  models: Array<{ id: string; label: string; resolutionOptions: string[] }>;
}

export const PROVIDERS_REGISTRY: Record<string, AIImageProvider> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "dall-e-3", label: "DALL-E 3", resolutionOptions: ["1024x1024", "1024x1792"] },
      { id: "dall-e-2", label: "DALL-E 2", resolutionOptions: ["512x512", "1024x1024"] }
    ]
  },
  replicate: {
    id: "replicate",
    name: "Replicate (Flux/SD)",
    models: [
      { id: "black-forest-labs/flux-schnell", label: "Flux Schnell", resolutionOptions: ["1024x1024"] }
    ]
  }
};
```

---

## 11. Preset System Review
The file `src/lib/style-presets.ts` defines six visual styles with hardcoded text descriptions and base prompts.

### Audit Findings:
* **Monolithic Prompts**: The prompt templates are plain strings, limiting the ability to inject dynamic user prompt edits or customize parameters (e.g. style intensity, aspect ratios, background variations).
* **Token Inefficiency**: Prompts reiterate structural instructions ("preserve identity, framing, silhouette...") repeatedly. This is costly and decreases output quality.

---

## 12. Prompt Engineering Recommendations

Switch to a structured structure where presets are templates that separate **aesthetic styles**, **system guidelines**, and **dynamic modifications**.

### Refactored Preset Schema (`src/lib/presets-config.ts`):
```typescript
export interface PromptPreset {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: (userInput: string) => string;
  parameters: {
    quality: string;
    styleWeight: number;
    steps?: number;
  };
}

export const STYLES_REGISTRY: Record<string, PromptPreset> = {
  "anime-cel": {
    slug: "anime-cel",
    name: "Anime Cel",
    description: "Clean cel shading with expressive color and crisp outlines.",
    systemPrompt: "You are an expert anime background and character illustrator. Your task is to output highly refined, professional anime cel keyframes.",
    userPromptTemplate: (input) => 
      `Restyle the uploaded image as high-end anime cel art. Subject focus: ${input}. Keep the identical pose, framing, and environment layout. Use crisp ink lines and vibrant colors.`,
    parameters: { quality: "hd", styleWeight: 0.9 }
  },
  "clay-render": {
    slug: "clay-render",
    name: "Clay Render",
    description: "Handcrafted clay texture with sculpted forms and warm depth.",
    systemPrompt: "You are a claymation lighting artist and digital sculptor. Focus on soft depth of field and realistic clay materials.",
    userPromptTemplate: (input) => 
      `Transform this scene to look like a physical clay model. Focus: ${input}. Sculpted details, warm ambient lighting, realistic plasticine fingerprints.`,
    parameters: { quality: "standard", styleWeight: 0.85 }
  }
};
```

---

## 13. AI Pipeline Architecture

The complete AI Generation pipeline must be secure, atomic, and handle asynchronous failures gracefully:

```
User uploads source -> Uploaded to ImageKit (/users/id/originals) ->
Insert DB Record (status=pending) -> Call OpenAI DALL-E-3 via API ->
OpenAI generates temp URL -> Download and re-upload to ImageKit (/users/id/generated) ->
Update DB Record (status=completed, generatedImageUrl=finalURL) -> Return response to User.
```

*If any step in the pipeline fails, the system runs a catch block, logging the message in the database (`status = 'failed'`, `errorMessage = error.message`) and returns a clean user error.*

---

## 14. Generation History Architecture

The application requires a solid management layer for user image logs.

### Features Checklist:
1. **Recent Generations**: Paginated queries utilizing keyset pagination rather than simple SQL offsets (`LIMIT Y OFFSET X`). Keyset pagination provides consistent speeds as history grows.
2. **Status Tracking**: Visual state indicators on the client (`pending` -> animate progress bar, `failed` -> show retry button and error details).
3. **Generation Retry**: Server action extracting the original generation parameters, creating a new generation queue record, and restarting the pipeline.
4. **Delete Generation (Orphan Cleanup)**:
   * Action removes the database record.
   * Action calls the ImageKit API to delete `originalImageUrl` and `generatedImageUrl` from remote storage to prevent billing leaks.
5. **Download Generated Image**: Direct action providing a clean, transformed download header bypassing browser defaults.

---

## 15. API Audit Report

* **`/api/auth`**: 
  * Integrates Better Auth handlers.
  * *Audit Recommendation*: Ensure `trustedOrigins` configurations explicitly allow staging environments when running preview builds on Vercel.
* **Server Action `generateImage`**:
  * *Authentication*: Verifies sessions.
  * *Validation*: Uses Zod for input schema checks.
  * *Audit Recommendation*: Add rate-limiting locks using Upstash Redis or memory-cache maps to avoid spamming the generation endpoints (e.g. limit to 3 generations per minute).

---

## 16. Security Audit Report

1. **User Data Ownership Isolation**:
   * All queries MUST include `.where(eq(generations.userId, session.user.id))` to prevent users from modifying or deleting generations belonging to other accounts.
2. **Prompt Injection Guardrails**:
   * When combining user inputs into preset templates, sanitize inputs. Prevent keywords like "Ignore previous instructions", "system prompts", or "output JSON" from passing directly to OpenAI.
3. **Environment Security**:
   * All API keys (`IMAGEKIT_PRIVATE_KEY`, `OPENAI_API_KEY`) must never be exposed to client-side bundles. Keep them exclusively in Next.js Server Actions or Route Handlers.

---

## 17. Performance Optimization Strategy

* **Optimized Pagination**:
  * Implement cursor-based fetching for history lists:
    ```typescript
    db.select()
      .from(generations)
      .where(and(eq(generations.userId, userId), lt(generations.id, cursor)))
      .orderBy(desc(generations.id))
      .limit(limit);
    ```
* **Connection Pooling**:
  * For Next.js API endpoints, leverage Neon serverless connection sharing. Drizzle connection configs should cache the driver client to prevent scaling out-of-memory errors under traffic spikes.

---

## 18. Scalability Roadmap

1. **Phase 1: Keyset Pagination & History (Immediate)**: Establish generations schema, implement cursor routes, build history dashboard pages.
2. **Phase 2: Multi-Provider Integration (Mid-Term)**: Add Fallback routing. If OpenAI times out, route to Replicate or Fal.ai engines.
3. **Phase 3: Extended Media Pipeline (Long-Term)**: Expand the `parameters` JSONB field to track frames, frame rates, and prompts for Video Generation.

---

## 19. Refactoring Recommendations

1. **Move Business Logic Out of Actions**:
   * Decouple your core generation pipeline into a service class: `src/lib/services/generation.ts`.
   * Server actions should exclusively validate inputs, authenticate users, and delegate to these decoupled services.
2. **Update Client Forms**:
   * Modify client components to support visual loading states, displaying progress loaders while generations reside in `pending` and `processing` stages.

---

## 20. Production Readiness Checklist

* [ ] Run drizzle-kit migrations to add the `generations` schema.
* [ ] Verify that index coverage satisfies complex query planners.
* [ ] Limit maximum file uploads to 5MB in the upload logic.
* [ ] Add automated error alerting (e.g. Sentry/Logtail) inside generation catch blocks.
* [ ] Setup security headers preventing frame-hijacking on ImageKit image assets.
