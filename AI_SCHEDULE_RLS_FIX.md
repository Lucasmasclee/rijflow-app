# AI Schedule RLS Policy Fix

## 🚨 Problem
When clicking on any week in the AI Schedule page, you get this error:
```
"error": "Failed to create new availability: new row violates row-level security policy for table \"instructor_availability\""
```

## 🔍 Root Cause
The issue is caused by a mismatch between the table structure in the database and what the API code expects:

1. **API Code expects**: New table structure with JSONB fields (`availability_data`, `settings`)
2. **Database has**: Old table structure with separate columns (`day_of_week`, `available`, `start_time`, `end_time`)

The API tries to insert data with the new structure, but the RLS policies are configured for the old structure, causing the policy violation.

## ✅ Solution

### Step 1: Run the Fix Script
Execute the SQL script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of fix-instructor-availability-table.sql
```

This script will:
- Drop the old tables
- Create new tables with the correct JSONB structure
- Set up proper RLS policies
- Create helper functions for AI weekplanning

### Step 2: Verify the Fix
Run the test script to verify everything is working:

```sql
-- Copy and paste the contents of test-availability-fix.sql
```

### Step 3: Test the Feature
1. Go to `/dashboard/ai-schedule`
2. Select any week
3. The error should be gone and you should see the instructor availability form

## 📋 What the Fix Does

### Database Changes
1. **student_availability table**: Updated to use JSONB for `availability_data`
2. **instructor_availability table**: Updated to use JSONB for `availability_data` and `settings`
3. **Week-based approach**: One record per student/instructor per week
4. **Proper RLS policies**: Allow instructors to manage their own availability

### Helper Functions
- `get_ai_weekplanning_data()`: Converts database data to AI format
- `get_week_dates()`: Generates week dates for planning

## 🔧 Technical Details

### Old Structure (Causing Issues)
```sql
CREATE TABLE instructor_availability (
  id UUID PRIMARY KEY,
  instructor_id UUID,
  day_of_week INTEGER,  -- 0=Sunday, 1=Monday, etc.
  available BOOLEAN,
  start_time TIME,
  end_time TIME
);
```

### New Structure (Fixed)
```sql
CREATE TABLE instructor_availability (
  id UUID PRIMARY KEY,
  instructor_id UUID,
  week_start DATE,           -- Monday of the week
  availability_data JSONB,   -- {"maandag": ["09:00", "17:00"], ...}
  settings JSONB,           -- {"maxLessenPerDag": 6, "blokuren": true, ...}
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🚀 Benefits After Fix

1. **No more RLS errors**: Proper policies allow instructors to manage their data
2. **Better performance**: JSONB indexes for faster queries
3. **Simplified API**: Direct JSON conversion without complex parsing
4. **Week-based planning**: More intuitive for scheduling
5. **Future-proof**: Ready for advanced AI features

## 🧪 Testing

After applying the fix, you should be able to:
1. ✅ Select any week without errors
2. ✅ Set instructor availability
3. ✅ Configure student availability
4. ✅ Adjust AI settings
5. ✅ Generate test planning

## 📞 Support

If you still encounter issues after running the fix:
1. Check the test script results
2. Verify you have students in your database
3. Ensure you're logged in as an instructor
4. Check the browser console for additional error details 