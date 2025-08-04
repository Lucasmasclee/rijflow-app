-- Check auth.users tabel structuur en constraints
-- Voer dit uit in Supabase SQL Editor

-- 1. Controleer auth.users tabel structuur
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 2. Controleer constraints op auth.users
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'users' 
AND tc.table_schema = 'auth';

-- 3. Controleer triggers op auth.users
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 4. Controleer RLS policies op auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'auth';

-- 5. Test een handmatige insert in auth.users (als service role)
-- Dit helpt om te zien of het probleem bij de tabel zelf ligt
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change_token_new,
    recovery_token
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"instructor"}'::jsonb,
    false,
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 6. Controleer of de insert is gelukt
SELECT COUNT(*) as total_users FROM auth.users WHERE email = 'test@example.com';

-- 7. Cleanup test data
DELETE FROM auth.users WHERE email = 'test@example.com';

-- 8. Controleer database logs (als toegankelijk)
-- SELECT * FROM pg_stat_activity WHERE state = 'active';

-- 9. Controleer of er custom functies zijn die auth.users beïnvloeden
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'auth'
AND routine_definition LIKE '%users%'; 