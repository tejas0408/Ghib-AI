CREATE TABLE IF NOT EXISTS "generations" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "original_image_url" text NOT NULL,
  "generated_image_url" text,
  "style" text NOT NULL,
  "preset" text NOT NULL,
  "prompt_used" text NOT NULL,
  "model" text NOT NULL,
  "generation_status" text DEFAULT 'pending' NOT NULL,
  "generation_time" integer,
  "image_width" integer,
  "image_height" integer,
  "file_size" integer,
  "error_message" text,
  "provider" text DEFAULT 'openai' NOT NULL,
  "parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "generations_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "generations_user_id_idx" ON "generations" ("user_id");
CREATE INDEX IF NOT EXISTS "generations_status_idx" ON "generations" ("generation_status");
CREATE INDEX IF NOT EXISTS "generations_created_at_idx" ON "generations" ("created_at");
CREATE INDEX IF NOT EXISTS "generations_user_created_at_idx" ON "generations" ("user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_value_idx"
  ON "verification_tokens" ("identifier", "value");
