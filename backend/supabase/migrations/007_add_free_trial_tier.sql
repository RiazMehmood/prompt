-- Migration 007: Add free_trial to subscription_tier enum
-- free_trial was added in Python models but missed in the DB enum definition.

ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'free_trial' BEFORE 'basic';
