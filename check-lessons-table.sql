-- Check and fix lessons table structure
-- Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: Check current table structure
-- ============================================================================

-- Check if lessons table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check foreign key constraints
-- ============================================================================

-- Check current foreign key constraints on lessons table
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
AND tc.table_name = 'lessons'
AND tc.table_schema = 'public';

-- ============================================================================
-- STEP 3: Check RLS policies
-- ============================================================================

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'lessons' 
AND schemaname = 'public';

-- Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'lessons' 
AND schemaname = 'public';

-- ============================================================================
-- STEP 4: Check available data
-- ============================================================================

-- Check if there are any students available
SELECT 
    'Available students' as info,
    id,
    first_name,
    last_name
FROM students 
LIMIT 5;

-- Check if there are any lessons in the table
SELECT 
    'Current lessons count' as info,
    COUNT(*) as total_lessons
FROM lessons;

-- Check if there are any students
SELECT 
    'Current students count' as info,
    COUNT(*) as total_students
FROM students;

-- Check if current user exists in auth.users
SELECT 
    'Current user check' as info,
    auth.uid() as current_user_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
        THEN 'User exists in auth.users' 
        ELSE 'User NOT found in auth.users' 
    END as user_status;

-- ============================================================================
-- STEP 5: Check for common issues
-- ============================================================================

-- Check if the lessons table has the correct foreign key references
SELECT 
    'Foreign key check' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'lessons' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%instructor_id%'
        ) THEN 'instructor_id foreign key exists'
        ELSE 'instructor_id foreign key MISSING'
    END as instructor_fk_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'lessons' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%student_id%'
        ) THEN 'student_id foreign key exists'
        ELSE 'student_id foreign key MISSING'
    END as student_fk_status;

-- Check if the foreign key references the correct tables
SELECT 
    'Foreign key details' as info,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'lessons' 
AND tc.constraint_type = 'FOREIGN KEY'; 