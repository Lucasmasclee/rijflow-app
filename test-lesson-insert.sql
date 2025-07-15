-- Simple test for lesson insertion
-- Run this in your Supabase SQL editor

-- ============================================================================
-- STEP 1: Get test data
-- ============================================================================

-- Get a valid student ID for testing
SELECT 
    'Test student' as info,
    id as student_id,
    first_name,
    last_name
FROM students 
LIMIT 1;

-- Get current user ID
SELECT 
    'Current user' as info,
    auth.uid() as instructor_id;

-- ============================================================================
-- STEP 2: Test lesson insertion (this will create a real test lesson)
-- ============================================================================

-- Insert a test lesson (you can delete this later)
INSERT INTO lessons (
    date,
    start_time,
    end_time,
    student_id,
    instructor_id,
    status,
    notes
) 
SELECT 
    '2025-01-20',
    '09:00:00',
    '10:00:00',
    s.id,
    auth.uid(),
    'scheduled',
    'Test lesson - can be deleted'
FROM students s
LIMIT 1;

-- ============================================================================
-- STEP 3: Verify the insertion worked
-- ============================================================================

-- Check if the test lesson was created
SELECT 
    'Test lesson created' as info,
    id,
    date,
    start_time,
    end_time,
    student_id,
    instructor_id,
    status,
    notes
FROM lessons 
WHERE notes = 'Test lesson - can be deleted'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- STEP 4: Clean up (optional - delete the test lesson)
-- ============================================================================

-- Uncomment the line below if you want to delete the test lesson
-- DELETE FROM lessons WHERE notes = 'Test lesson - can be deleted'; 