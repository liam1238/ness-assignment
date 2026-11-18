-- Runs once, on a new Docker data volume, before Postgres accepts connections.
-- Creates the dedicated test database. Schema is applied later by migrations.
-- The development database is created by POSTGRES_DB and must not be used for tests.
CREATE DATABASE tasks_test;
