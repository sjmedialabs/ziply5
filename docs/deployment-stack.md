# Deployment Stack (Confirmed)

## Infrastructure

- **Hosting:** VPS
- **CDN:** CloudFront
- **Backend Runtime:** Node.js
- **Database:** Supabase Postgres
- **Queue:** BullMQ
- **Cache:** Redis

## How It Maps to This Codebase

- `DATABASE_URL` points to Supabase Postgres (Prisma datasource).
- BullMQ uses `REDIS_URL` for queue connections.
- Redis is used for queue/cache.
- File storage uses VPS filesystem (`STORAGE_LOCAL_PATH`).
- Public asset URLs are generated using `CDN_BASE_URL` (CloudFront domain).

## Recommended Production Setup

1. Run Next.js server in Node mode on VPS behind Nginx.
2. Use Supabase connection pooling URL for `DATABASE_URL`.
3. Run Redis locally on VPS or managed Redis instance.
4. Run separate BullMQ worker process for background jobs.
5. Configure CloudFront origin to the VPS static uploads directory route.
6. Enable HTTPS and strict security headers at reverse proxy.

## Environment Variables

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `STORAGE_LOCAL_PATH`
- `CDN_BASE_URL`
