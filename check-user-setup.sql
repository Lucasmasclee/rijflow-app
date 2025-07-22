-- Check user setup and foreign key constraints
-- IMPORTANT: Run this in your Supabase SQL editor to diagnose user account issues

-- ============================================================================
-- STEP 1: CHECK CURRENT USER
-- ============================================================================

-- Get current user ID
SELECT 
  'Current user ID' as info,
  auth.uid() as user_id;

-- Check if current user exists in auth.users
SELECT 
  'User exists in auth.users' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
    THEN 'YES' 
    ELSE 'NO' 
  END as user_exists;

-- ============================================================================
-- STEP 2: CHECK USER DETAILS
-- ============================================================================

-- Get user details from auth.users (if user exists)
SELECT 
  id,
  email,
  created_at,
  updated_at,
  raw_user_meta_data
FROM auth.users 
WHERE id = auth.uid();

-- ============================================================================
-- STEP 3: CHECK FOREIGN KEY REFERENCES
-- ============================================================================

-- Check if there are any references to this user in other tables
SELECT 
  'students table' as table_name,
  COUNT(*) as references_count
FROM students 
WHERE instructor_id = auth.uid()

UNION ALL

SELECT 
  'instructor_availability table' as table_name,
  COUNT(*) as references_count
FROM instructor_availability 
WHERE instructor_id = auth.uid()

UNION ALL

SELECT 
  'standard_availability table' as table_name,
  COUNT(*) as references_count
FROM standard_availability 
WHERE instructor_id = auth.uid()

UNION ALL

SELECT 
  'instructor_ai_settings table' as table_name,
  COUNT(*) as references_count
FROM instructor_ai_settings 
WHERE instructor_id = auth.uid();

-- ============================================================================
-- STEP 4: CHECK TABLE STRUCTURE
-- ============================================================================

-- Check instructor_availability table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'instructor_availability'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'instructor_availability';

-- ============================================================================
-- STEP 5: TEST INSERT (if user exists)
-- ============================================================================

-- Only try this if the user exists in auth.users
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid()) INTO user_exists;
  
  IF user_exists THEN
    -- Try to insert a test record
    INSERT INTO instructor_availability (
      instructor_id,
      week_start,
      availability_data,
      settings
    ) VALUES (
      auth.uid(),
      '2025-01-20'::date,
      '{"maandag": ["09:00", "17:00"]}'::jsonb,
      '{"maxLessenPerDag": 6}'::jsonb
    ) ON CONFLICT (instructor_id, week_start) DO NOTHING;
    
    RAISE NOTICE 'Test insert successful for user %', auth.uid();
    
    -- Clean up test data
    DELETE FROM instructor_availability 
    WHERE instructor_id = auth.uid() 
      AND week_start = '2025-01-20'::date;
      
    RAISE NOTICE 'Test data cleaned up';
  ELSE
    RAISE NOTICE 'User does not exist in auth.users table';
  END IF;
END $$;

-- ============================================================================
-- DIAGNOSIS RESULTS
-- ============================================================================

-- Based on the results above:

-- ✅ If user_exists = 'YES' and test insert works:
--    - Your user account is properly set up
--    - The RLS policy fix should work
--    - Try the AI schedule feature again

-- ❌ If user_exists = 'NO':
--    - Your user account is not properly created in auth.users
--    - You may need to sign up again or contact support
--    - The foreign key constraint will always fail

-- ❌ If test insert fails with RLS error:
--    - The RLS policy still needs fixing
--    - Try the temporary RLS disable script

-- ❌ If test insert fails with other error:
--    - There's a different issue with the table structure
--    - Check the error message for details 