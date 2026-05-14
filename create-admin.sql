-- BDO Quiz System - Create Admin User
-- Run this in Supabase SQL Editor

-- IMPORTANT: Replace the hash on line 20 with one you generate locally BEFORE running:
--   node -e "const b=require('bcrypt'); b.hash('YourNewPassword',10).then(console.log)"
-- Never commit or share plaintext passwords in any file.

INSERT INTO "User" (
  id, 
  email, 
  password, 
  department, 
  "isAdmin", 
  "displayName", 
  "darkMode", 
  "createdAt"
)
VALUES (
  'admin-' || gen_random_uuid()::text,
  'admin@bdo.co.zw',
  '$2b$10$F6xHW2DkCwrdtlEU3JVhXO3.zRhdkqMcHzyYXv8sMagw1Dg.339OG',
  'Admin',
  true,
  'System Administrator',
  false,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Verify the admin was created
SELECT 
  email, 
  department, 
  "isAdmin", 
  "displayName",
  "createdAt"
FROM "User" 
WHERE email = 'admin@bdo.co.zw';
