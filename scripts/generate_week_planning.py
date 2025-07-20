#!/usr/bin/env python3
"""
Week Planning Generator
Reads test input data and generates a week planning response
"""

import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

def load_test_input(file_path: str) -> Dict[str, Any]:
    """Load the test input JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Test input file not found at {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in test input file: {e}")
        sys.exit(1)

def get_next_monday() -> datetime:
    """Get the next Monday from today"""
    today = datetime.now()
    days_ahead = 7 - today.weekday()  # Monday is 0
    if days_ahead == 7:
        days_ahead = 0
    next_monday = today + timedelta(days=days_ahead)
    return next_monday.replace(hour=0, minute=0, second=0, microsecond=0)

def parse_time_range(time_range: List[str]) -> tuple:
    """Parse time range from [start, end] format"""
    if len(time_range) != 2:
        return "09:00", "17:00"
    return time_range[0], time_range[1]

def is_time_between(time: str, start: str, end: str) -> bool:
    """Check if time is between start and end time"""
    def time_to_minutes(t: str) -> int:
        hours, minutes = map(int, t.split(':'))
        return hours * 60 + minutes
    
    time_min = time_to_minutes(time)
    start_min = time_to_minutes(start)
    end_min = time_to_minutes(end)
    
    return start_min <= time_min <= end_min

def generate_week_planning(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate week planning based on test input data"""
    
    # Get next Monday as the start of the week
    week_start = get_next_monday()
    
    # Day mapping
    day_mapping = {
        'maandag': 0,
        'dinsdag': 1,
        'woensdag': 2,
        'donderdag': 3,
        'vrijdag': 4,
        'zaterdag': 5,
        'zondag': 6
    }
    
    # Generate week dates
    week_dates = []
    for i in range(7):
        date = week_start + timedelta(days=i)
        week_dates.append(date.strftime('%Y-%m-%d'))
    
    lessons = []
    warnings = []
    
    # Process each student
    for student in test_data.get('leerlingen', []):
        student_id = student.get('id', '')
        student_name = student.get('naam', '')
        lessons_per_week = student.get('lessenPerWeek', 2)
        lesson_duration = student.get('lesDuur', 60)
        availability = student.get('beschikbaarheid', {})
        preferences = student.get('voorkeuren', [])
        notes = student.get('notities', '')
        
        # Find available days for this student
        available_days = []
        for day_name, time_range in availability.items():
            if day_name in day_mapping:
                day_index = day_mapping[day_name]
                if day_index < 5:  # Only weekdays
                    start_time, end_time = parse_time_range(time_range)
                    available_days.append({
                        'day_index': day_index,
                        'day_name': day_name,
                        'start_time': start_time,
                        'end_time': end_time,
                        'date': week_dates[day_index]
                    })
        
        if not available_days:
            warnings.append(f"Geen beschikbare dagen gevonden voor {student_name}")
            continue
        
        # Check instructor availability for student's available days
        instructor_availability = test_data.get('instructeur', {}).get('beschikbareUren', {})
        valid_days = []
        
        for day in available_days:
            day_name = day['day_name']
            if day_name in instructor_availability:
                instr_start, instr_end = parse_time_range(instructor_availability[day_name])
                # Check if there's overlap between student and instructor availability
                if is_time_between(day['start_time'], instr_start, instr_end) or \
                   is_time_between(day['end_time'], instr_start, instr_end) or \
                   is_time_between(instr_start, day['start_time'], day['end_time']):
                    valid_days.append(day)
        
        if not valid_days:
            warnings.append(f"Geen overlappende beschikbare tijden voor {student_name}")
            continue
        
        # Distribute lessons across available days
        lessons_per_day = lessons_per_week // len(valid_days)
        extra_lessons = lessons_per_week % len(valid_days)
        
        lesson_count = 0
        for i, day in enumerate(valid_days):
            day_lessons = lessons_per_day + (1 if i < extra_lessons else 0)
            
            if lesson_count >= lessons_per_week:
                break
                
            # Calculate lesson times for this day
            start_time = day['start_time']
            end_time = day['end_time']
            
            # Parse times to calculate available minutes
            start_hour, start_minute = map(int, start_time.split(':'))
            end_hour, end_minute = map(int, end_time.split(':'))
            
            available_minutes = (end_hour * 60 + end_minute) - (start_hour * 60 + start_minute)
            
            # Check if we can fit lessons on this day
            total_lesson_time = day_lessons * lesson_duration
            break_time = test_data.get('instructeur', {}).get('pauzeTussenLessen', 5)
            total_break_time = (day_lessons - 1) * break_time
            
            if total_lesson_time + total_break_time > available_minutes:
                # Adjust number of lessons for this day
                max_lessons = (available_minutes - total_break_time) // lesson_duration
                day_lessons = max(1, max_lessons)
                warnings.append(f"Aangepast aantal lessen voor {student_name} op {day['day_name']}: {day_lessons}")
            
            # Create lessons for this day
            current_time = start_time
            for j in range(day_lessons):
                if lesson_count >= lessons_per_week:
                    break
                    
                # Calculate lesson end time
                start_hour, start_minute = map(int, current_time.split(':'))
                end_hour = start_hour + (start_minute + lesson_duration) // 60
                end_minute = (start_minute + lesson_duration) % 60
                lesson_end_time = f"{end_hour:02d}:{end_minute:02d}"
                
                # Create lesson
                lesson = {
                    "date": day['date'],
                    "startTime": current_time,
                    "endTime": lesson_end_time,
                    "studentId": student_id,
                    "studentName": student_name,
                    "notes": notes if notes else None
                }
                lessons.append(lesson)
                
                lesson_count += 1
                
                # Add break time (except after last lesson)
                if j < day_lessons - 1 and lesson_count < lessons_per_week:
                    break_hour = end_hour + (end_minute + break_time) // 60
                    break_minute = (end_minute + break_time) % 60
                    current_time = f"{break_hour:02d}:{break_minute:02d}"
                else:
                    current_time = lesson_end_time
    
    # Generate summary
    total_lessons = len(lessons)
    unique_students = len(set(lesson['studentId'] for lesson in lessons))
    
    summary = f"Weekplanning gegenereerd met {total_lessons} lessen voor {unique_students} leerlingen"
    if warnings:
        summary += f". {len(warnings)} waarschuwingen opgemerkt."
    
    return {
        "lessons": lessons,
        "summary": summary,
        "warnings": warnings
    }

def main():
    """Main function"""
    # Get the test input file path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    test_input_path = os.path.join(project_root, 'src', 'app', 'dashboard', 'ai-schedule', 'ai-weekplanning-testinput.json')
    
    # Load test input
    test_data = load_test_input(test_input_path)
    
    # Generate week planning
    result = generate_week_planning(test_data)
    
    # Output as JSON
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main() 