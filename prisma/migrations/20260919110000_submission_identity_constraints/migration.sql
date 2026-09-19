BEGIN;

-- Refuse to change any constraints if existing rows already violate the
-- required identity key. No rows are deleted or modified by this migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Submission"
    GROUP BY "opId", "discordId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot apply submission identity migration: duplicate (opId, discordId) rows exist';
  END IF;
END
$$;

-- Remove legacy unique constraints on IGN or op alone when present.
DO $$
DECLARE
  constraint_name TEXT;
  column_names TEXT[];
BEGIN
  FOR constraint_name, column_names IN
    SELECT
      c.conname,
      ARRAY(
        SELECT a.attname
        FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = key.attnum
        ORDER BY key.ord
      )
    FROM pg_constraint c
    WHERE c.conrelid = 'Submission'::regclass
      AND c.contype = 'u'
  LOOP
    IF column_names = ARRAY['ign']::TEXT[]
       OR column_names = ARRAY['opId']::TEXT[]
    THEN
      EXECUTE format(
        'ALTER TABLE "Submission" DROP CONSTRAINT %I',
        constraint_name
      );
    END IF;
  END LOOP;
END
$$;

-- The submission identity is (opId, discordId). Creating the same key twice
-- is intentionally rejected by the database without changing any rows.
CREATE UNIQUE INDEX IF NOT EXISTS "Submission_opId_discordId_key"
  ON "Submission" ("opId", "discordId");

COMMIT;
