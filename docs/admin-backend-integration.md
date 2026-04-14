# Admin/Seller Dashboard Integration Guide

This scaffold adds backend APIs without changing existing UI design.

## Stack Profile (Locked)

- Backend: Node.js (Next.js API routes)
- DB: Supabase Postgres
- Cache: Redis
- Queue: BullMQ
- Hosting: VPS
- CDN: CloudFront

## 1) Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and Redis.
3. Run:
   - `npm run prisma:generate`
   - `npm run prisma:push`
4. Start app: `npm run dev`.

## 2) API Base

- Base path: `/api/v1`
- Auth endpoints:
  - `POST /auth/signup`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- Product endpoints:
  - `GET /products?page=1&limit=20`
  - `POST /products`
- CMS endpoints:
  - `GET /cms/pages?slug=home`
  - `POST /cms/pages`
- Dashboard endpoint:
  - `GET /dashboard/summary`

## 3) UI Binding Rule (No UI Refactor)

Attach API calls to existing IDs/classes/events only.

Example:

- `#adminLoginForm` submit -> `POST /api/v1/auth/login`
- `#productCreateBtn` click -> `POST /api/v1/products`
- `#cmsSaveBtn` click -> `POST /api/v1/cms/pages`
- Dashboard cards load -> `GET /api/v1/dashboard/summary`

## 4) RBAC in Current Scaffold

- `super_admin`: all permissions
- `admin`: dashboard/products/orders/cms read-write
- `seller`: dashboard + own product scope (create/update/read)
- `customer`: managed only, no dashboard scope

## 5) Notes

- This is a production-ready modular starter.
- Extend modules in `src/server/modules/*` without changing UI layer.
