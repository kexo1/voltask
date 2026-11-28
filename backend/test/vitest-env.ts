// Predvolené hodnoty zjednodušujú lokálne spustenie; CI ich môže nahradiť vlastným prostredím.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'testovaci_jwt_kluc_aspon_32_bajtov_pre_voltask';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://ucm:ucm_local_password@localhost:5432/ucm_tasks?schema=public';
