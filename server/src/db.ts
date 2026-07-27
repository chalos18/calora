/**
 * The narrow surface both `pg.Pool` (production) and PGlite (tests) satisfy.
 *
 * Tests run against real Postgres semantics in-process rather than against a
 * mock, because the behaviour worth guarding here - that a past day does not
 * move when a food is corrected - is a property of the queries, not of the
 * TypeScript around them.
 */
export interface Db {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}
