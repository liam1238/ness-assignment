import pg from "pg";

// OID 1082 = DATE — parse as string YYYY-MM-DD, not JavaScript Date
pg.types.setTypeParser(1082, (val: string) => val);

export type PgPool = pg.Pool;

export function createPool(connectionString: string, max = 10): PgPool {
  return new pg.Pool({ connectionString, max });
}