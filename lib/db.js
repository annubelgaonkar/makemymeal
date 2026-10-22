import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pool;
let schemaReady;

function getPool() {
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (!pool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString) || connectionString.includes("host=/");
    pool = new pg.Pool({
      connectionString,
      max: 3,
      ssl: local ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  short_id         TEXT NOT NULL,
  token_hash       TEXT NOT NULL,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  address          TEXT NOT NULL,
  pin_lat          DOUBLE PRECISION,
  pin_lng          DOUBLE PRECISION,
  note             TEXT,
  items            JSONB NOT NULL,
  subtotal         INTEGER NOT NULL,
  delivery_fee     INTEGER NOT NULL,
  total            INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','preparing','out','delivered')),
  otp_enc          TEXT NOT NULL,
  otp_attempts     INTEGER NOT NULL DEFAULT 0,
  otp_locked_until TIMESTAMPTZ,
  sms_status       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  out_at           TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
`;

export async function query(text, params) {
  const p = getPool();
  if (!schemaReady) schemaReady = p.query(SCHEMA).catch((e) => { schemaReady = null; throw e; });
  await schemaReady;
  return p.query(text, params);
}
