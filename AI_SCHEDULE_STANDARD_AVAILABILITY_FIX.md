# AI Schedule Standard Availability Fix

## 🚨 Problem
When selecting a week in the AI Schedule page, you get this error:
```
{"error":"No data found for the specified instructor and week"}
```

This happens because:
1. The `instructor_availability` table doesn't have a record for the selected instructor and week
2. The system doesn't have a proper fallback mechanism to use `standard_availability` data
3. The `standard_availability` table might not exist or be properly configured

## ✅ Solution

### Step 1: Run the Fix Script
Execute the SQL script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of fix-ai-schedule-standard-availability.sql
```

This script will:
- ✅ Ensure the `standard_availability` table exists with proper structure
- ✅ Create helper functions for standard availability
- ✅ Update the `get_ai_weekplanning_data` function with automatic fallback
- ✅ Ensure all instructors have `standard_availability` records
- ✅ Add proper RLS policies

### Step 2: Test the Fix
Run the test script to verify everything is working:

```sql
-- Copy and paste the contents of test-ai-schedule-fix.sql
```

### Step 3: Test the Feature
1. Go to `/dashboard/ai-schedule`
2. Select any week
3. The error should be gone and you should see the instructor availability form

## 🔧 How the Fix Works

### Automatic Fallback Mechanism
When an instructor selects a week without existing availability, the system will:

1. **Check for `instructor_availability`** for that specific week
2. **If not found**, use `standard_availability` as fallback
3. **If no `standard_availability`**, use default values (Mon-Fri 9:00-17:00)
4. **Automatically create** a new `instructor_availability` record

### Database Changes

#### 1. `standard_availability` Table
```sql
CREATE TABLE standard_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  availability_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(instructor_id)
);
```

#### 2. Updated `get_ai_weekplanning_data` Function
The function now includes automatic fallback logic:
- Checks for week-specific availability
- Falls back to standard availability
- Creates new records automatically
- Returns proper AI weekplanning format

#### 3. Helper Functions
- `get_standard_availability(p_instructor_id UUID)`: Retrieves standard availability
- `get_week_dates(p_week_start DATE)`: Generates week dates

### API Changes

#### Updated `/api/ai-schedule/create-editable-input`
- ✅ Better error handling
- ✅ Debug logging for troubleshooting
- ✅ Automatic fallback to standard availability
- ✅ Proper data validation

## 📋 What the Fix Does

### 1. Database Structure
- **Ensures `standard_availability` table exists** with proper JSONB structure
- **Creates indexes** for better performance
- **Sets up RLS policies** for security

### 2. Fallback Logic
- **Week-specific data**: First tries to find `instructor_availability` for the selected week
- **Standard availability**: Falls back to `standard_availability` if no week-specific data
- **Default values**: Uses sensible defaults if no standard availability exists
- **Auto-creation**: Automatically creates new records when needed

### 3. Data Integrity
- **Ensures all instructors have standard availability**: Creates default records for instructors without them
- **Proper JSON structure**: Maintains consistent data format
- **Error handling**: Graceful handling of missing data

## 🧪 Testing

### Test 1: Database Setup
Run the test script to verify:
- ✅ All tables exist with correct structure
- ✅ RLS policies are properly configured
- ✅ Helper functions work correctly
- ✅ Data integrity is maintained

### Test 2: AI Schedule Flow
1. **Navigate to AI Schedule**: Go to `/dashboard/ai-schedule`
2. **Select a week**: Choose any week from the dropdown
3. **Verify no errors**: Should load without "No data found" error
4. **Check data**: Should show instructor availability form with data

### Test 3: Fallback Testing
1. **Delete week-specific data**: Remove an `instructor_availability` record
2. **Select that week**: Should automatically use `standard_availability`
3. **Verify functionality**: Should work without errors

## 🚀 Benefits

### For Users
- ✅ **No more errors**: AI schedule works reliably
- ✅ **Automatic setup**: No manual configuration needed
- ✅ **Consistent experience**: Works for all instructors

### For Developers
- ✅ **Robust fallback**: Handles missing data gracefully
- ✅ **Better debugging**: Enhanced logging and error messages
- ✅ **Maintainable code**: Clear separation of concerns

## 📝 Files Modified

### SQL Scripts
- `fix-ai-schedule-standard-availability.sql` (new)
- `test-ai-schedule-fix.sql` (new)

### API Routes
- `src/app/api/ai-schedule/create-editable-input/route.ts` (enhanced)

### Database Functions
- `get_ai_weekplanning_data()` (updated with fallback)
- `get_standard_availability()` (new helper function)

## 🔍 Troubleshooting

### If the error persists:
1. **Check database**: Run the test script to verify table structure
2. **Check RLS policies**: Ensure policies allow instructor access
3. **Check data**: Verify instructors have standard availability records
4. **Check logs**: Look for debug messages in the API response

### Common Issues:
- **RLS policy violations**: Ensure policies are correctly configured
- **Missing standard availability**: Run the fix script to create default records
- **Invalid JSON data**: Check data format in the tables

## ✅ Completion

After running the fix script, the AI schedule feature should work without the "No data found" error. The system will automatically handle missing data by using standard availability as a fallback. 