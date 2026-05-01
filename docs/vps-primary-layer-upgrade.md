# VPS Primary Layer Upgrade

This project now supports a VPS-first delivery model:

Users -> Nginx -> Next.js -> Internal API layer -> Supabase.

## What changed

- Added production Nginx template: `infra/nginx/ziply5.conf`
- Added systemd unit template: `infra/systemd/ziply5-web.service`
- Hardened upload pipeline (`/api/v1/uploads`) with:
  - rate limiting
  - binary signature validation for images
  - max file-size and max-files checks
  - deterministic path sanitization
  - variant generation (`thumbnail`, `medium`, `original`)
  - rollback cleanup on partial failures
- Hardened static upload read route:
  - stricter traversal protection
  - immutable cache only for versioned variants
- Added optional rate limiting utility with Redis support:
  `src/server/security/rate-limit.ts`
- Added security and cache headers in `next.config.mjs`
- Added backup scripts:
  - `scripts/backup-db.sh`
  - `scripts/backup-assets.sh`
  - `scripts/check-storage-usage.sh`

## Deployment steps

1. Copy Nginx config:
   - `sudo cp infra/nginx/ziply5.conf /etc/nginx/sites-available/ziply5.conf`
   - `sudo ln -sf /etc/nginx/sites-available/ziply5.conf /etc/nginx/sites-enabled/ziply5.conf`
   - `sudo nginx -t && sudo systemctl reload nginx`

2. Ensure asset directory exists:
   - `sudo mkdir -p /var/www/assets/products`
   - `sudo chown -R www-data:www-data /var/www/assets`

3. Configure web service:
   - `sudo cp infra/systemd/ziply5-web.service /etc/systemd/system/ziply5-web.service`
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now ziply5-web`

4. Optional Redis (recommended for shared rate-limits):
   - set `REDIS_ENABLED=true`
   - set `REDIS_URL=redis://127.0.0.1:6379`

## Recommended environment

- `STORAGE_LOCAL_PATH=/var/www/assets`
- `UPLOAD_IMAGE_MAX_BYTES=8388608`
- `UPLOAD_IMAGE_THUMB_WIDTH=320`
- `UPLOAD_IMAGE_MEDIUM_WIDTH=900`
- `UPLOAD_RATE_LIMIT_PER_MIN=120`
- `UPLOAD_MAX_FILES_PER_REQUEST=20`
- `BULK_UPLOAD_RATE_LIMIT_PER_10M=20`

## Rollback

1. Revert app to previous git commit.
2. Restore old Nginx site config and reload Nginx.
3. Restart previous app service.
4. Upload endpoints remain backward compatible, so existing stored URLs continue to work.

## Backup schedule examples (crontab)

```
15 2 * * * /var/www/ziply5/scripts/backup-db.sh >> /var/log/ziply5/backup-db.log 2>&1
45 2 * * * /var/www/ziply5/scripts/backup-assets.sh >> /var/log/ziply5/backup-assets.log 2>&1
*/30 * * * * /var/www/ziply5/scripts/check-storage-usage.sh >> /var/log/ziply5/storage-check.log 2>&1
```
