# AI Schedule Settings Fix

## Problem
The AI schedule settings were causing a "read-only file system" error when trying to update `sample_input.json` in production (Vercel). This happened because:

1. The application was trying to write to files in production where the file system is read-only
2. The settings were being stored in files instead of the database
3. The Python script was hardcoded to read from a specific file location

## Solution
The fix involves storing AI schedule settings in the database instead of files, and passing them to the Python script via environment variables.

### Database Changes
1. **Created `instructor_ai_settings` table** to store AI scheduling preferences:
   - `pauze_tussen_lessen` (INTEGER, default: 5)
   - `lange_pauze_duur` (INTEGER, default: 0)
   - `locaties_koppelen` (BOOLEAN, default: true)
   - `blokuren` (BOOLEAN, default: true)

2. **Added TypeScript interface** `InstructorAISettings` in `src/types/database.ts`

### API Changes
1. **Created new API route** `/api/ai-schedule/update-settings`:
   - `POST`: Updates AI settings in database
   - `GET`: Retrieves AI settings from database

2. **Updated test route** `/api/ai-schedule/test`:
   - Fetches AI settings from database
   - Passes settings to Python script via environment variables

3. **Removed old file-based route** `/api/ai-schedule/update-sample-input`

### Frontend Changes
1. **Updated AI schedule page** to use database API instead of file updates
2. **Added settings loading** on component mount
3. **Updated settings change handler** to use new database API

### Python Script Changes
1. **Added environment variable support** to read settings from environment
2. **Added `get_settings_from_env()` function** to parse environment variables
3. **Updated `generate_week_planning()`** to override instructor settings with environment values

## Files Modified
- `create-instructor-ai-settings.sql` (new)
- `src/types/database.ts`
- `src/app/api/ai-schedule/update-settings/route.ts` (new)
- `src/app/api/ai-schedule/test/route.ts`
- `src/app/dashboard/ai-schedule/page.tsx`
- `scripts/generate_week_planning.py`

## Files Removed
- `src/app/api/ai-schedule/update-sample-input/route.ts`

## Deployment Steps
1. Run the SQL script `create-instructor-ai-settings.sql` in Supabase
2. Deploy the updated code
3. Test the AI schedule settings functionality

## Benefits
- ✅ Works in production (no file system writes)
- ✅ Settings persist across deployments
- ✅ Per-instructor settings support
- ✅ Better error handling and validation
- ✅ Maintains backward compatibility with default values 