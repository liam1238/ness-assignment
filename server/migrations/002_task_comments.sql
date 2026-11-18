CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body text NOT NULL,
  author text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX task_comments_task_id_created_at_id
  ON task_comments (task_id, created_at, id);