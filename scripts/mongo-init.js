// Run manually with mongosh as a provisioning administrator, never as the app user.
// DB_NAME and MONGO_APP_PASSWORD are read only from the provisioning process environment.
const name = process.env.DB_NAME
const password = process.env.MONGO_APP_PASSWORD
if (!name || !password) throw new Error('Provisioning environment is incomplete.')
const app = db.getSiblingDB(name)
const collections = ['users', 'sessions', 'recipients', 'programs', 'enrollments', 'disbursements', 'chain_events', 'settings', 'counters', 'rate_limits']
const privileges = collections.map(collection => ({ resource: { db: name, collection }, actions: ['find', 'insert', 'update'] }))
privileges.push({ resource: { db: name, collection: 'audit_logs' }, actions: ['find', 'insert'] })
if (!app.getRole('bansos_runtime')) app.createRole({ role: 'bansos_runtime', privileges, roles: [] })
else app.updateRole('bansos_runtime', { privileges, roles: [] })
if (!app.getUser('bansos_app')) app.createUser({ user: 'bansos_app', pwd: password, roles: [{ role: 'bansos_runtime', db: name }] })
// No readWrite role: it would grant remove and permit rewriting audit_logs.
// Provision collections/indexes separately with administrative credentials via db:indexes.
