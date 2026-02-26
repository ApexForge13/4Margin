-- Add description column to claims table for contractor-provided claim context
-- This is a required field in the wizard where the contractor describes
-- the claim situation to help generate stronger supplement justifications.

alter table claims add column if not exists description text;
