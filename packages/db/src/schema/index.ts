// ⚠️ IMPORTANT (relational query builder) :
// Toutes les tables ET toutes les relations doivent être exportées ici, puis passées
// à drizzle(pool, { schema }). Un oubli casse `db.query.*` silencieusement.
export * from './enums';
export * from './auth';
export * from './catalog';
export * from './wallet';
export * from './billing';
export * from './engagement';
export * from './relations';
