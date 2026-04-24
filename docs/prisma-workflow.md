# Prisma workflow

## Required migration-first flow

- Use `npx prisma migrate dev --name <migration_name>` for local schema changes.
- Use `npx prisma migrate deploy` in staging/production.
- Do not use `npx prisma db push` outside temporary local prototyping.

## Files to commit

- `prisma/schema.prisma`
- `prisma/migrations/*`

## Files to never commit

- `node_modules/`
- `.prisma/`
- generated Prisma client artifacts

## Local drift recovery

```bash
npx prisma migrate reset
npx prisma generate
```

## Sync health checks

```bash
npx prisma migrate status
```

The pre-commit hook blocks schema-only commits by requiring staged migration files when `prisma/schema.prisma` changes.
