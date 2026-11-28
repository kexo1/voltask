// Predvolene hodnoty ulahcuju lokalne spustenie; CI ich moze nahradit vlastnym prostredim.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'super_secret_test_jwt_key_with_at_least_32_bytes_length';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://ucm:ucm_local_password@localhost:5432/ucm_tasks?schema=public';
