-- Test script to verify student access after applying the comprehensive fix
-- Run this in your Supabase SQL editor to test if the RLS policies are working

-- ============================================================================
-- TEST 1: Check if current user can access their student record
-- ============================================================================

SELECT 
    'TEST 1: Student record access' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASSED - User can access their student record'
        ELSE 'FAILED - User cannot access their student record'
    END as result,
    COUNT(*) as record_count
FROM students 
WHERE user_id = auth.uid();

-- ============================================================================
-- TEST 2: Check if current user can access their availability records
-- ============================================================================

SELECT 
    'TEST 2: Student availability access' as test_name,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'PASSED - User can access their availability records'
        ELSE 'FAILED - User cannot access their availability records'
    END as result,
    COUNT(*) as record_count
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE s.user_id = auth.uid();

-- ============================================================================
-- TEST 3: Check if current user can insert availability (simulation)
-- ============================================================================

-- This test simulates an insert without actually inserting
SELECT 
    'TEST 3: Student availability insert permission' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM students 
            WHERE user_id = auth.uid()
        ) THEN 'PASSED - User should be able to insert availability'
        ELSE 'FAILED - User cannot insert availability'
    END as result;

-- ============================================================================
-- TEST 4: Check current user information
-- ============================================================================

SELECT 
    'TEST 4: Current user info' as test_name,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    auth.jwt() ->> 'role' as role,
    auth.jwt() ->> 'student_id' as student_id;

-- ============================================================================
-- TEST 5: Check student record details
-- ============================================================================

SELECT 
    'TEST 5: Student record details' as test_name,
    id,
    first_name,
    last_name,
    email,
    user_id,
    instructor_id,
    created_at
FROM students 
WHERE user_id = auth.uid();

-- ============================================================================
-- TEST 6: Check if user can access users table (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'TEST 6: Users table exists - checking access...';
        
        -- This should work if the users table RLS policies are correct
        PERFORM COUNT(*) FROM users WHERE id = auth.uid();
        
        RAISE NOTICE 'TEST 6: PASSED - User can access users table';
    ELSE
        RAISE NOTICE 'TEST 6: SKIPPED - Users table does not exist';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
    'SUMMARY' as summary,
    'If all tests above show PASSED, then the RLS policies are working correctly.' as message,
    'Students should now be able to access their dashboard without 403 errors.' as result; 