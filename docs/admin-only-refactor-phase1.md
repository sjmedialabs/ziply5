# Admin-Only Refactor (Phase 1)

This phase removes runtime seller dependency while preserving route/API compatibility and avoiding destructive schema changes.

## Updated DB Schema

`prisma/schema.prisma` now includes non-destructive ownership fields:

- `Product.createdById`, `Product.managedById`
- `Order.createdById`, `Order.managedById`
- `InventoryItem.createdById`, `InventoryItem.managedById`
- `WithdrawalRequest.createdById`, `WithdrawalRequest.managedById`
- `WithdrawalRequest.sellerId` changed to nullable (legacy compatibility)
- `Product.sellerId` remains nullable and retained for backward compatibility

## Migration Script

Run:

- `prisma/admin-only-phase1.sql`

What it does:

- Adds ownership fields and indexes (idempotent)
- Ensures FK constraints to `User`
- Makes legacy `sellerId` nullable where required
- Backfills ownership:
  - `Product`: from `sellerId` -> fallback to default admin
  - `WithdrawalRequest`: from `sellerId` -> fallback to default admin

## Refactored APIs (No Route Breakage)

- `app/api/v1/products/*`
  - Removed seller access scope in API resolution.
  - Product create now always stamps `createdById/managedById` with admin actor.
  - Legacy `sellerId` request field is accepted but ignored.
- `app/api/v1/orders/*`
  - Seller-specific order visibility removed from service layer.
- `app/api/v1/inventory/route.ts`
  - Seller-scoped inventory filtering removed; admin-managed overview only.
- `app/api/v1/reviews/route.ts`
  - Seller review listing branch removed; unified admin/customer behavior.
- `app/api/v1/returns/route.ts`
  - Seller return listing branch removed; unified admin/customer behavior.
- `app/api/v1/dashboard/summary/route.ts`
  - Seller summary branch removed; admin scope returned.
- `app/api/v1/finance/my/route.ts`
  - Now admin-only aggregate finance endpoint (kept route for compatibility).
- `app/api/v1/finance/withdrawals/route.ts`
  - GET admin-only.
  - POST returns `410` (deprecated in admin-only mode), route retained.

## Auth / RBAC Simplification

- Removed seller role from active RBAC constants:
  - `src/server/core/rbac/permissions.ts`
- Removed seller portal from auth validation:
  - `src/server/modules/auth/auth.validator.ts`
  - `src/server/modules/auth/auth.service.ts`
- Signup/user creation role enums no longer allow seller:
  - `app/api/v1/auth/signup/route.ts`
  - `app/api/v1/users/route.ts`

## Seller UI Handling (No Layout Redesign)

- Seller login route preserved but redirected to admin login:
  - `app/seller/login/page.tsx`
- Seller panel routes preserved but redirected to admin dashboard:
  - `app/seller/(panel)/layout.tsx`
- Seller profile redirect in storefront header removed:
  - `components/Header.tsx`
- Seller navigation item removed from admin sidebar:
  - `components/dashboard/AdminPanelLayout.tsx`

## Removed Seller Dependencies (Phase 1)

- Seller portal auth checks
- Seller-specific role grants in runtime RBAC
- Seller-scoped product/order/inventory/review/returns API branches
- Seller dashboard summary branch for API responses
- Seller withdrawals workflow (runtime behavior deprecated)

## Regression Test Checklist

- [ ] Admin can create product (`/api/v1/products`, admin token)
- [ ] Admin can edit product (`/api/v1/products/[id]`)
- [ ] Admin can view all orders (`/api/v1/orders`)
- [ ] Admin can manage inventory (`/api/v1/inventory`)
- [ ] Seller login is not possible (`/seller/login` redirects to `/admin/login`)
- [ ] Seller panel routes do not expose seller console (`/seller/*` redirects)
- [ ] Public storefront product pages still load
- [ ] Products dropdown/category listing still renders

## Notes

- Legacy seller columns are intentionally retained.
- Seller module can be restored later via feature-flag strategy without schema rollback.
- Phase 2 cleanup status is documented in `docs/admin-only-refactor-phase2.md`.
