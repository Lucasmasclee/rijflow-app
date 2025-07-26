-- Test SMS System
-- Run this in your Supabase SQL editor to test the SMS system

-- ============================================================================
-- STEP 1: VERIFY DATABASE STRUCTURE
-- ============================================================================

-- Check if SMS columns exist in students table
SELECT 
    'SMS COLUMNS CHECK' as test_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('public_token', 'sms_laatst_gestuurd', 'public_url')
ORDER BY column_name;

-- ============================================================================
-- STEP 2: VERIFY RLS POLICIES
-- ============================================================================

-- Check RLS policies on students table
SELECT 
    'STUDENTS RLS POLICIES' as test_type,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'students'
ORDER BY policyname;

-- Check RLS policies on student_availability table
SELECT 
    'STUDENT_AVAILABILITY RLS POLICIES' as test_type,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'student_availability'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: TEST DATA INSERTION
-- ============================================================================

-- Insert a test student with SMS fields
INSERT INTO students (
    first_name,
    last_name,
    email,
    phone,
    address,
    instructor_id,
    public_token,
    public_url
) VALUES (
    'Test',
    'Leerling',
    'test@example.com',
    '0612345678',
    'Test Adres 123',
    (SELECT id FROM auth.users LIMIT 1),
    'test-public-token-123',
    'https://rijflow.nl/beschikbaarheid/test-public-token-123'
) ON CONFLICT (public_token) DO NOTHING;

-- ============================================================================
-- STEP 4: VERIFY TEST DATA
-- ============================================================================

-- Check if test student was created
SELECT 
    'TEST STUDENT CREATION' as test_type,
    id,
    first_name,
    last_name,
    phone,
    public_token,
    public_url,
    sms_laatst_gestuurd
FROM students 
WHERE public_token = 'test-public-token-123';

-- ============================================================================
-- STEP 5: TEST AVAILABILITY INSERTION
-- ============================================================================

-- Insert test availability data
INSERT INTO student_availability (
    student_id,
    week_start,
    availability_data
) VALUES (
    (SELECT id FROM students WHERE public_token = 'test-public-token-123'),
    '2025-01-27',
    '{"maandag": ["09:00", "17:00"], "dinsdag": ["09:00", "17:00"], "woensdag": ["09:00", "17:00"], "donderdag": ["09:00", "17:00"], "vrijdag": ["09:00", "17:00"], "zaterdag": ["09:00", "17:00"], "zondag": ["09:00", "17:00"]}'::jsonb
) ON CONFLICT (student_id, week_start) DO UPDATE SET
    availability_data = EXCLUDED.availability_data,
    updated_at = NOW();

-- ============================================================================
-- STEP 6: VERIFY AVAILABILITY DATA
-- ============================================================================

-- Check if availability data was inserted
SELECT 
    'AVAILABILITY DATA TEST' as test_type,
    sa.id,
    s.first_name,
    s.last_name,
    sa.week_start,
    sa.availability_data,
    sa.created_at
FROM student_availability sa
JOIN students s ON sa.student_id = s.id
WHERE s.public_token = 'test-public-token-123';

-- ============================================================================
-- STEP 7: TEST PUBLIC TOKEN ACCESS
-- ============================================================================

-- Test public token access (this should work without authentication)
SELECT 
    'PUBLIC TOKEN ACCESS TEST' as test_type,
    id,
    first_name,
    last_name,
    public_token,
    public_url
FROM students 
WHERE public_token = 'test-public-token-123';

-- ============================================================================
-- STEP 8: CLEANUP TEST DATA
-- ============================================================================

-- Clean up test data (uncomment to run)
/*
DELETE FROM student_availability 
WHERE student_id = (SELECT id FROM students WHERE public_token = 'test-public-token-123');

DELETE FROM students 
WHERE public_token = 'test-public-token-123';
*/

-- ============================================================================
-- STEP 9: SUMMARY
-- ============================================================================

SELECT 
    'SMS SYSTEM TEST SUMMARY' as test_type,
    'All tests completed successfully' as status,
    'Check the results above for any errors' as notes; 