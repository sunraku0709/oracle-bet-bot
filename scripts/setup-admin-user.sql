-- ============================================================
-- Oracle Bet – Create admin@oracle-bet.com premium account
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Delete old test user (subscriptions row cascades via FK)
DELETE FROM auth.users
WHERE id = '91d8c1ea-6d0d-402e-b338-6fe9f187b6b2';

-- 2. Create new admin user + insert subscription in one transaction
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create the user in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@oracle-bet.com',
    crypt('Admin1234!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Insert the premium subscription row
  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    daily_analyses_used,
    daily_pronostics_used,
    daily_analyses_limit,
    daily_pronostics_limit,
    analyses_used,
    billing_period_start,
    updated_at
  ) VALUES (
    v_user_id,
    'premium',
    'active',
    0,
    0,
    9999,
    9999,
    0,
    NOW(),
    NOW()
  );

  -- Confirm
  RAISE NOTICE 'Admin user created. UUID: %', v_user_id;
  RAISE NOTICE 'Email: admin@oracle-bet.com | Password: Admin1234!';
END;
$$;

-- 3. Verify
SELECT
  u.id        AS user_id,
  u.email,
  u.created_at,
  s.plan,
  s.status,
  s.daily_analyses_limit,
  s.daily_pronostics_limit
FROM auth.users u
JOIN public.subscriptions s ON s.user_id = u.id
WHERE u.email = 'admin@oracle-bet.com';
