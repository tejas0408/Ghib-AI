import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const generationStatusValues = ['pending', 'processing', 'completed', 'failed'] as const;
export const generationStatusEnum = generationStatusValues;
export type GenerationStatus = (typeof generationStatusValues)[number];
export type GenerationParameters = Record<string, unknown>;

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  }),
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    accountId: text('account_id').notNull(),
    idToken: text('id_token'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
  }),
);

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    identifierValueIdx: uniqueIndex('verification_tokens_identifier_value_idx').on(
      table.identifier,
      table.value,
    ),
  }),
);

// Deprecated: retained for existing historical rows. New generation writes use `generations`.
export const renders = pgTable(
  'renders',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceImage: text('source_image').notNull(),
    generatedImage: text('generated_image').notNull(),
    style: text('style').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('renders_user_id_idx').on(table.userId),
  }),
);

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
    generationTime: integer('generation_time'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    fileSize: integer('file_size'),
    errorMessage: text('error_message'),
    provider: text('provider').default('openai').notNull(),
    parameters: jsonb('parameters').$type<GenerationParameters>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('generations_user_id_idx').on(table.userId),
    statusIdx: index('generations_status_idx').on(table.generationStatus),
    createdAtIdx: index('generations_created_at_idx').on(table.createdAt),
    userCreatedAtIdx: index('generations_user_created_at_idx').on(table.userId, table.createdAt),
  }),
);

export const verifications = verificationTokens;

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  renders: many(renders),
  generations: many(generations),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const rendersRelations = relations(renders, ({ one }) => ({
  user: one(users, {
    fields: [renders.userId],
    references: [users.id],
  }),
}));

export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id],
  }),
}));
