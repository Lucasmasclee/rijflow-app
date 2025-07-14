-- Add lesson settings fields to students table
-- These fields allow instructors to set default lesson parameters per student

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS default_lessons_per_week INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS default_lesson_duration_minutes INTEGER DEFAULT 60;

-- Add comments to document the new fields
COMMENT ON COLUMN students.default_lessons_per_week IS 'Default number of lessons per week for this student';
COMMENT ON COLUMN students.default_lesson_duration_minutes IS 'Default duration of each lesson in minutes for this student';

-- Update existing students to have reasonable defaults if they don't have values
UPDATE students 
SET 
  default_lessons_per_week = COALESCE(default_lessons_per_week, 2),
  default_lesson_duration_minutes = COALESCE(default_lesson_duration_minutes, 60)
WHERE default_lessons_per_week IS NULL OR default_lesson_duration_minutes IS NULL; 