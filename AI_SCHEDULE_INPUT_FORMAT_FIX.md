# AI Schedule Input Format Fix

## Problem
The AI schedule generation was failing because the input data format didn't match the expected `sample_input.json` structure. Specifically:

1. **Instructor Availability**: The frontend was sending an array with `available: true/false` for each day, but the `generate_week_planning.js` script expects only available days to be included in the `beschikbareUren` object.

2. **Time Format**: Times were being sent with seconds (HH:MM:SS) but the script expects HH:MM format.

3. **Student Availability**: The structured availability data wasn't being properly transformed to the expected format.

## Solution

### 1. Fixed Instructor Availability Transformation

**File**: `src/app/api/ai-schedule/test/route.ts`

**Before**:
```javascript
instructorAvailability?.forEach(avail => {
  const dayName = dayNames[avail.day_of_week]
  if (avail.available) {
    instructor.beschikbareUren[dayName] = [avail.start_time, avail.end_time]
  }
})
```

**After**:
```javascript
instructorAvailability?.forEach(avail => {
  const dayName = dayNames[avail.day_of_week]
  if (avail.available) {
    // Format time to HH:MM format (remove seconds)
    const startTime = avail.start_time.split(':').slice(0, 2).join(':')
    const endTime = avail.end_time.split(':').slice(0, 2).join(':')
    instructor.beschikbareUren[dayName] = [startTime, endTime]
  }
  // Note: Unavailable days are simply not included in beschikbareUren
})
```

### 2. Updated Sample Input Format

**File**: `scripts/sample_input.json`

- Removed `zondag` from instructor availability (only available days included)
- Ensured consistent time format (HH:MM)
- Maintained exact structure expected by `generate_week_planning.js`

### 3. Enhanced Student Availability Processing

**File**: `src/app/api/ai-schedule/test/route.ts`

Added support for structured availability data from the frontend:

```javascript
// If we have structured availability data, use it
if (student.availability && Array.isArray(student.availability)) {
  student.availability.forEach((day: any) => {
    if (day.available && dayMapping[day.day]) {
      const dutchDay = dayMapping[day.day]
      // Format time to HH:MM format (remove seconds)
      const startTime = day.startTime.split(':').slice(0, 2).join(':')
      const endTime = day.endTime.split(':').slice(0, 2).join(':')
      beschikbaarheid[dutchDay] = [startTime, endTime]
    }
  })
}
```

## Expected Data Format

### Instructor Availability
```json
{
  "beschikbareUren": {
    "maandag": ["09:00", "17:00"],
    "dinsdag": ["09:00", "17:00"],
    "woensdag": ["09:00", "13:00"],
    "donderdag": ["09:00", "17:00"],
    "vrijdag": ["13:00", "17:00"],
    "zaterdag": ["09:00", "17:00"]
  }
}
```

**Note**: Only available days are included. Unavailable days (like Sunday) are omitted entirely.

### Student Availability
```json
{
  "beschikbaarheid": {
    "maandag": ["09:00", "17:00"],
    "woensdag": ["10:00", "16:00"],
    "vrijdag": ["08:00", "18:00"]
  }
}
```

**Note**: Only available days are included for each student.

## Key Changes

1. **Time Format**: All times are now in HH:MM format (no seconds)
2. **Day Names**: English day names are mapped to Dutch equivalents
3. **Availability Filtering**: Only available days are included in the output
4. **Consistent Structure**: Matches exactly the format expected by `generate_week_planning.js`

## Testing

The format transformation has been verified with a test script that confirms:
- ✅ Instructor availability is properly filtered
- ✅ Time format is correctly converted
- ✅ Student availability is properly structured
- ✅ The format matches the expected `sample_input.json` structure

## Result

The AI schedule generation should now work correctly with the proper input format that matches the `sample_input.json` structure exactly. 