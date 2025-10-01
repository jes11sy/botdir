-- Create database if not exists
-- This script should be run manually in PostgreSQL before running Prisma migrations

CREATE DATABASE callcentre_crm;

-- Connect to the database and create extensions if needed
\c callcentre_crm;

-- Create extensions (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
