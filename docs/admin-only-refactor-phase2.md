# Admin-Only Refactor (Phase 2)

Phase 2 removes remaining runtime seller code paths while preserving route/API contracts.

## Completed Cleanup

- Removed seller-scoped internals from product listing/access services.
- Removed seller-only validator fields from product payload schemas.
- Removed seller ownership helpers from inventory/review/returns internals.
- Removed seller redirect behavior from auth client bindings and storefront profile resolver.
- Removed seller role seeding from auth bootstrap scripts.

## Compatibility Kept

- Seller route namespace (`/seller/*`) is still present but now redirects to admin routes.
- Seller report endpoint path (`/api/v1/reports/sellers`) is preserved but now returns platform aggregate data.
- Legacy schema fields (`sellerId`) remain in DB for historical/backward compatibility and safe rollback.

## Files Refactored (Phase 2)

- `src/server/modules/products/products.service.ts`
- `src/server/modules/products/products.validator.ts`
- `src/server/modules/extended/extended.service.ts`
- `src/server/modules/dashboard/dashboard.service.ts`
- `app/api/v1/products/route.ts`
- `app/api/v1/products/[id]/route.ts`
- `app/api/v1/products/by-slug/[slug]/route.ts`
- `app/api/v1/inventory/route.ts`
- `app/api/v1/reports/sellers/route.ts`
- `components/dashboard/ProductConsolePage.tsx`
- `app/admin/(panel)/dashboard/page.tsx`
- `scripts/seed-auth.mjs`
- `prisma/auth-init.sql`
- `src/client/bindings/admin-auth.binding.ts`

## Regression Checklist (Phase 2)

- [ ] Admin product list/create/edit works
- [ ] Admin orders list/details work
- [ ] Inventory listing and patch updates work
- [ ] Finance summary and finance/my work for admin roles
- [ ] `/seller/login` redirects to `/admin/login`
- [ ] `/seller/*` panel routes redirect to `/admin/dashboard`
- [ ] `/api/v1/reports/sellers` responds with platform aggregate row
- [ ] Storefront product/category/menu flows remain intact
