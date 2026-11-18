CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  assignee text,
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (previous_status <> new_status)
);

CREATE INDEX tasks_due_date_created_at_id ON tasks (due_date, created_at, id);
CREATE INDEX tasks_created_at_id ON tasks (created_at, id);
CREATE INDEX task_status_history_task_id_changed_at ON task_status_history (task_id, changed_at);