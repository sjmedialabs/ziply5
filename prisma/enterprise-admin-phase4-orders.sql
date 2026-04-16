-- Phase 4 additive updates for OMS lifecycle
BEGIN;

DO $$
BEGIN
  ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'packed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'returned';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
