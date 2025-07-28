# AI Schedule Generate Planning Feature

## Overview

This feature adds a fifth screen to the AI schedule page that allows users to generate a `sample_input.json` file in the exact format required by the `generate_week_planning.js` script.

## New Screen: "Genereer Weekplanning"

### Location
- Navigate to: `/dashboard/ai-schedule`
- Step 5: "Genereer Planning" (after Test Planning)

### Functionality

1. **Generate Sample Input Button**: Click "Genereer Weekplanning" to create a `sample_input.json` file
2. **Data Sources**: The file is generated from the following database tables:
   - `instructor_availability` - Instructor availability for the selected week
   - `instructor_ai_settings` - AI settings (blokuren, pauzeTussenLessen, etc.)
   - `students` - Student information (id, naam, lessenPerWeek, lesDuur)
   - `student_availability` - Student availability for the selected week

3. **File Format**: The generated file matches the exact format of `scripts/sample_input.json`

### Generated File Structure

```json
{
  "instructeur": {
    "beschikbareUren": {
      "maandag": ["09:00", "17:00"],
      "dinsdag": ["09:00", "17:00"],
      // ... other days
    },
    "datums": ["2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", "2025-07-25", "2025-07-26", "2025-07-27"],
    "blokuren": true,
    "pauzeTussenLessen": 10,
    "langePauzeDuur": 0,
    "locatiesKoppelen": true
  },
  "leerlingen": [
    {
      "id": "student-id",
      "naam": "Student Name",
      "lessenPerWeek": 2,
      "lesDuur": 60,
      "beschikbaarheid": {
        "maandag": ["09:00", "17:00"],
        "dinsdag": ["09:00", "17:00"]
        // ... other days
      }
    }
    // ... other students
  ]
}
```

### File Location

The generated file is saved to:
```
src/app/dashboard/ai-schedule/generated/sample_input.json
```

### API Endpoint

- **URL**: `/api/ai-schedule/generate-sample-input`
- **Method**: POST
- **Body**: 
  ```json
  {
    "weekStart": "2025-07-21",
    "instructorId": "instructor-id"
  }
  ```

### Testing

Use the test script to validate the generated file:
```bash
node scripts/test_sample_input.js
```

This script will:
1. Check if the file exists
2. Validate the JSON structure
3. Verify all required fields are present
4. Test the file with `generate_week_planning.js`

### Integration with generate_week_planning.js

The generated file can be used directly with the planning script:
```bash
node scripts/generate_week_planning.js "src/app/dashboard/ai-schedule/generated/sample_input.json"
```

### Debugging

- The entire generated file is printed to the console for debugging
- Check the browser console and server logs for detailed output
- The file is also displayed in the UI after generation

## Implementation Details

### Database Queries

The API endpoint performs the following queries:

1. **Instructor Availability**:
   ```sql
   SELECT * FROM instructor_availability 
   WHERE instructor_id = ? AND week_start = ?
   ```

2. **AI Settings**:
   ```sql
   SELECT * FROM instructor_ai_settings 
   WHERE instructor_id = ?
   ```

3. **Students**:
   ```sql
   SELECT * FROM students 
   WHERE instructor_id = ?
   ```

4. **Student Availability**:
   ```sql
   SELECT * FROM student_availability 
   WHERE week_start = ?
   ```

### Week Date Generation

The system generates dates for Monday through Sunday of the selected week, ensuring the first day is always Monday.

### Data Mapping

- Instructor availability is mapped from the database format to the required JSON format
- Student names are formatted as "First Last" or "First" if no last name
- Default values are used for missing settings (lessenPerWeek: 2, lesDuur: 60, etc.)

## Usage Workflow

1. Navigate to AI Schedule page
2. Select a week
3. Configure instructor availability
4. Configure student availability
5. Configure AI settings
6. Run test planning (optional)
7. **Generate sample input file**
8. Use the generated file with the planning script

## Error Handling

- Missing data is handled gracefully with default values
- Database errors are logged and reported to the user
- File system errors are caught and logged
- Invalid JSON structures are validated before saving 