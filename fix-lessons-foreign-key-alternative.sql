-- Alternative fix for lessons table foreign key constraint issue
-- IMPORTANT: Run this in your Supabase SQL editor to fix the 409 Conflict error
-- This approach preserves existing data

-- ============================================================================
-- STEP 1: Check current foreign key constraints
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
-- STEP 2: Drop existing foreign key constraints
-- ============================================================================

-- Drop the instructor_id foreign key constraint if it exists
DO $$
BEGIN
    -- Find and drop the instructor_id foreign key constraint
    EXECUTE (
        'ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS ' ||
        (SELECT constraint_name 
         FROM information_schema.table_constraints 
         WHERE table_name = 'lessons' 
         AND table_schema = 'public' 
         AND constraint_type = 'FOREIGN KEY'
         AND constraint_name LIKE '%instructor_id%')
    );
EXCEPTION
    WHEN OTHERS THEN
        -- If no constraint found, that's fine
        NULL;
END $$;

-- ============================================================================
-- STEP 3: Add correct foreign key constraint
-- ============================================================================

-- Add the correct foreign key constraint for instructor_id
ALTER TABLE public.lessons 
ADD CONSTRAINT lessons_instructor_id_fkey 
FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Verify the foreign key constraint
-- ============================================================================

-- Check that the foreign key constraint was created correctly
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
-- STEP 5: Test the foreign key constraint
-- ============================================================================

-- Test that we can reference auth.users correctly
SELECT 
    'Foreign key test' as test,
    COUNT(*) as auth_users_count
FROM auth.users;

-- Test that current user exists in auth.users
SELECT 
    'Current user test' as test,
    auth.uid() as current_user_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) 
        THEN 'User exists in auth.users' 
        ELSE 'User NOT found in auth.users' 
    END as user_status;

-- ============================================================================
-- STEP 6: Ensure RLS policies are correct
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Instructors can manage own lessons" ON lessons;
DROP POLICY IF EXISTS "Students can view own lessons" ON lessons;

-- Policy: Instructors can manage their own lessons
CREATE POLICY "Instructors can manage own lessons" ON lessons
  FOR ALL USING (auth.uid() = instructor_id);

-- Policy: Students can view their own lessons
CREATE POLICY "Students can view own lessons" ON lessons
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id 
      FROM students 
      WHERE id = lessons.student_id
    )
  );

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script has successfully:
-- 1. Checked existing foreign key constraints
-- 2. Dropped the problematic instructor_id foreign key constraint
-- 3. Added the correct foreign key constraint referencing auth.users(id)
-- 4. Verified the constraint was created correctly
-- 5. Ensured RLS policies are in place

-- The lessons table should now work correctly with proper foreign key references. 