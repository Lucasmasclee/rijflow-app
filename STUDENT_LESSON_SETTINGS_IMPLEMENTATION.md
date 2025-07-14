# Student Lesson Settings Implementation

## Overview
This implementation adds lesson settings and statistics functionality to the student detail page, allowing instructors to configure default lesson parameters per student and view lesson statistics.

## New Features Added

### 1. Lesson Settings (Editable)
Instructors can now set and edit the following parameters for each student:
- **Default lessons per week**: Number of lessons typically scheduled per week (1-7)
- **Default lesson duration**: Duration of each lesson in minutes (30-180 minutes, in 15-minute increments)

### 2. Lesson Statistics (Read-only)
The system now displays the following statistics for each student:
- **Lessons completed**: Number of lessons where the date is today or earlier (excluding cancelled lessons)
- **Lessons scheduled**: Number of lessons where the date is after today (excluding cancelled lessons)

## Database Changes

### New Fields Added to `students` Table
```sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS default_lessons_per_week INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS default_lesson_duration_minutes INTEGER DEFAULT 60;
```

### SQL Script
The file `add-student-lesson-settings.sql` contains the complete SQL script to add these fields to your database.

## UI Changes

### Student Detail Page (`/dashboard/students/[id]`)
1. **New Lesson Settings Section**: Added between "General Notes" and "Progress Notes"
   - Editable fields for lessons per week and lesson duration
   - Edit/Save/Cancel functionality
   - Input validation (1-7 lessons per week, 30-180 minutes duration)

2. **Updated Statistics Section**: Enhanced sidebar statistics
   - Added "Lessen gehad" (completed lessons) with green color
   - Added "Lessen ingepland" (scheduled lessons) with blue color
   - Maintained existing statistics (total lessons, last lesson, member since)

## Technical Implementation

### TypeScript Types
Updated `src/types/database.ts` to include new fields:
```typescript
export interface Student {
  // ... existing fields
  default_lessons_per_week?: number
  default_lesson_duration_minutes?: number
}
```

### State Management
Added new state variables in the student detail page:
- `lessonStats`: Tracks completed and scheduled lesson counts
- `lessonSettings`: Manages the editable lesson settings
- `isEditingLessonSettings`: Controls edit mode for lesson settings
- `savingLessonSettings`: Loading state for save operations

### API Integration
- **Fetch lesson statistics**: Queries lessons table to count completed vs scheduled lessons
- **Update lesson settings**: Updates student record with new default values
- **Real-time updates**: Statistics refresh when lesson data changes

## Usage Instructions

### For Instructors
1. Navigate to a student's detail page
2. In the "Lesinstellingen" section, click "Bewerken"
3. Set the desired default lessons per week and lesson duration
4. Click "Opslaan" to save changes
5. View lesson statistics in the sidebar

### Default Values
- Lessons per week: 2 (range: 1-7)
- Lesson duration: 60 minutes (range: 30-180, increments of 15)

## Benefits
1. **Personalized Planning**: Each student can have different lesson schedules
2. **Quick Statistics**: Easy overview of student progress and upcoming lessons
3. **Efficient Scheduling**: Default values speed up lesson planning process
4. **Progress Tracking**: Clear distinction between completed and scheduled lessons

## Future Enhancements
These settings could be used to:
- Auto-generate lesson schedules
- Calculate expected completion dates
- Generate reports on lesson frequency
- Integrate with AI scheduling features 