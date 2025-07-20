import json
import random
from datetime import datetime, timedelta
import locale
from collections import defaultdict
from math import factorial

# Set locale to Dutch for day names
try:
    locale.setlocale(locale.LC_TIME, 'nl_NL.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'Dutch_Netherlands.1252')
    except:
        pass

# Define the day order variations that match get_next_week_dates function


def parse_time(time_str):
    """Parse time string in HH:MM format to minutes since midnight"""
    hours, minutes = map(int, time_str.split(':'))
    return hours * 60 + minutes

def format_time(minutes):
    """Convert minutes since midnight to HH:MM format"""
    hours = minutes // 60
    minutes_remainder = minutes % 60
    return f"{hours:02d}:{minutes_remainder:02d}"

def get_next_week_dates(random_week_index, instructor):
    """Get the dates for the week based on the dates provided in the input file"""
    week_dates = {}
    
    # Get the dates from the instructor data
    datums = instructor.get('datums', [])
    
    # Define the standard week order that corresponds to the dates in the input file
    # The dates array follows the standard week order: Monday to Sunday
    standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
    
    # Map the standard week order to the provided dates
    for i, day in enumerate(standard_week_order):
        if i < len(datums):
            week_dates[day] = datums[i]
        else:
            # Fallback: calculate date if not enough dates provided
            today = datetime.now()
            days_ahead = 7 - today.weekday()  # Days until Monday
            if days_ahead <= 0:  # Target day already happened this week
                days_ahead += 7
            next_monday = today + timedelta(days=days_ahead)
            date = next_monday + timedelta(days=i)
            week_dates[day] = date.strftime('%Y-%m-%d')
    
    return week_dates

def check_consecutive_lessons_time(day_lessons, new_lesson_start, new_lesson_end, instructor):
    """
    Check if adding a new lesson would create more than 3 hours of consecutive lessons.
    Returns True if a long break is needed, False otherwise.
    """
    if not day_lessons:
        return False
    
    # Sort existing lessons by start time
    sorted_lessons = sorted(day_lessons, key=lambda x: x['startTime'])
    
    # Find lessons that would be consecutive with the new lesson
    consecutive_lessons = []
    
    for lesson in sorted_lessons:
        lesson_start = parse_time(lesson['startTime'])
        lesson_end = parse_time(lesson['endTime'])
        
        # Check if this lesson would be consecutive with the new lesson
        # (no gap or gap less than minimum pause)
        if (lesson_end <= new_lesson_start and 
            new_lesson_start - lesson_end < instructor['pauzeTussenLessen']):
            consecutive_lessons.append(lesson)
        elif (new_lesson_end <= lesson_start and 
              lesson_start - new_lesson_end < instructor['pauzeTussenLessen']):
            consecutive_lessons.append(lesson)
    
    if not consecutive_lessons:
        return False
    
    # Calculate total consecutive time
    all_lessons = consecutive_lessons + [{'startTime': format_time(new_lesson_start), 'endTime': format_time(new_lesson_end)}]
    all_lessons.sort(key=lambda x: x['startTime'])
    
    total_consecutive_time = parse_time(all_lessons[-1]['endTime']) - parse_time(all_lessons[0]['startTime'])
    
    # Check if we would exceed 3 hours (180 minutes)
    if total_consecutive_time >= 180:
        return True
    
    return False

def add_long_break_if_needed(day_lessons, new_lesson_start, new_lesson_end, instructor, students):
    """
    Add a 20-minute long break if adding a lesson would create more than 3 hours of consecutive lessons.
    Returns the adjusted start time for the new lesson.
    """
    if not check_consecutive_lessons_time(day_lessons, new_lesson_start, new_lesson_end, instructor):
        return new_lesson_start
    
    # Find the best place to insert the long break
    sorted_lessons = sorted(day_lessons, key=lambda x: x['startTime'])
    
    # Find the lesson that would come before the new lesson
    prev_lesson = None
    for lesson in sorted_lessons:
        lesson_end = parse_time(lesson['endTime'])
        if lesson_end <= new_lesson_start:
            prev_lesson = lesson
    
    if prev_lesson:
        # Insert break after the previous lesson
        break_start = parse_time(prev_lesson['endTime']) + instructor['pauzeTussenLessen']
        break_end = break_start + instructor['langePauzeDuur']
        
        # Adjust new lesson start time
        adjusted_start = break_end + instructor['pauzeTussenLessen']
        
        if print_details:
            print(f"  [Lange pauze van {instructor['langePauzeDuur']} minuten toegevoegd]")
        return adjusted_start
    
    return new_lesson_start

def can_schedule_block_hour(student_id, day, used_time_slots, instructor):
    """
    Check if a student can schedule a block hour (2 consecutive lessons) on a given day.
    Returns True if possible, False otherwise.
    """
    if not instructor.get('blokuren', False):
        return False
    
    # Check if student already has lessons on this day
    day_lessons = [lesson for lesson in used_time_slots[day] if lesson['studentId'] == student_id]
    
    if day_lessons:
        return False  # Student already has lessons on this day
    
    return True

def can_schedule_normal_hour(student_id, day, used_time_slots, instructor):
    """
    Check if a student can schedule a normal hour on a given day.
    Returns True if possible, False otherwise.
    """
    # Check if student already has lessons on this day
    day_lessons = [lesson for lesson in used_time_slots[day] if lesson['studentId'] == student_id]
    
    if not day_lessons:
        return True  # No lessons yet, can schedule normal hour
    
    # If blokuren is not enabled, can't have multiple lessons per day
    if not instructor.get('blokuren', False):
        return False
    
    # If student already has any lessons on this day, can't schedule more
    # (either they already have a normal hour or a block hour)
    return False

def generate_week_planning(random_week_index, start_vanaf_begin, print_details=True):
    """Generate optimized week planning maximizing number of lessons"""
    
    # Load input data
    with open('sample_input.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    instructor = data['instructeur']
    students = data['leerlingen']
    
    # Get next week dates
    week_dates = get_next_week_dates(random_week_index, instructor)
    
    lessons = []
    warnings = []
    
    # Track lessons per student
    student_lessons = {student['id']: 0 for student in students}
    
    # Track lessons per student per day to ensure max 1 lesson per day (or block hour)
    student_lessons_per_day = {student['id']: {day: 0 for day in week_dates.keys()} for student in students}
    
    # Track used time slots per day to prevent overlaps
    used_time_slots = {day: [] for day in week_dates.keys()}
    
    # Create all possible time slots with 5-minute intervals
    all_time_slots = []
    
    for day, date in week_dates.items():
        if day not in instructor['beschikbareUren']:
            continue
            
        # Check if the day has available hours (not empty array)
        if not instructor['beschikbareUren'][day] or len(instructor['beschikbareUren'][day]) < 2:
            continue
            
        instructor_start = parse_time(instructor['beschikbareUren'][day][0])
        instructor_end = parse_time(instructor['beschikbareUren'][day][1])
        
        # Create time slots every 5 minutes
        if(start_vanaf_begin):
            current_time = instructor_start
        else:
            current_time = instructor_end
        
        while (start_vanaf_begin and current_time < instructor_end) or (not start_vanaf_begin and current_time > instructor_start):
            # Find all students available at this time
            available_students = []
            
            for student in students:
                if (student_lessons[student['id']] < student['lessenPerWeek'] and 
                    day in student['beschikbaarheid']):
                    
                    student_start = parse_time(student['beschikbaarheid'][day][0])
                    student_end = parse_time(student['beschikbaarheid'][day][1])
                    
                    # Check if student can schedule a lesson on this day
                    can_schedule = False
                    
                    # Always try block hours first if possible
                    if can_schedule_block_hour(student['id'], day, used_time_slots, instructor):
                        # Can schedule block hour (either single long lesson or multiple consecutive short lessons)
                        if student_start <= current_time and current_time + student['lesDuur'] <= student_end:
                            can_schedule = True
                    elif can_schedule_normal_hour(student['id'], day, used_time_slots, instructor):
                        # Can schedule normal hour
                        if student_start <= current_time and current_time + student['lesDuur'] <= student_end:
                            can_schedule = True
                    
                    if can_schedule:
                        available_students.append(student)
            
            if available_students:
                all_time_slots.append({
                    'day': day,
                    'date': date,
                    'time': current_time,
                    'available_students': available_students.copy()
                })
            
            if(start_vanaf_begin):
                current_time += 5
            else:
                current_time -= 5
    
    # Sort time slots by priority:
    # 1. Day (according to the current week variation)
    # 2. Time (earlier is better)
    # Create a mapping from day names to their position in the current week variation
    current_day_order = {day: i for i, day in enumerate(day_variations[random_week_index])}
    all_time_slots.sort(key=lambda x: (current_day_order.get(x['day'], 999), x['time']))
    
    # Greedy algorithm: assign lessons to time slots
    for slot in all_time_slots:
        day = slot['day']
        date = slot['date']
        time = slot['time']
        
        # Filter available students (some might have been assigned in previous slots)
        available_students = []
        for student in slot['available_students']:
            if student_lessons[student['id']] < student['lessenPerWeek']:
                # Check if student can still schedule a lesson on this day
                can_schedule = False
                
                # Always try block hours first if possible
                if can_schedule_block_hour(student['id'], day, used_time_slots, instructor):
                    can_schedule = True
                elif can_schedule_normal_hour(student['id'], day, used_time_slots, instructor):
                    can_schedule = True
                
                if can_schedule:
                    available_students.append(student)
        
        if available_students:
            # Select student with highest priority:
            # 1. Block hours first (highest priority) - students who can schedule block hours
            # 2. Most remaining lessons (second priority)
            # 3. Student ID for tie-breaking
            selected_student = max(available_students, 
                                 key=lambda s: (
                                     can_schedule_block_hour(s['id'], day, used_time_slots, instructor),  # Block hours first (True > False)
                                     s['lessenPerWeek'] - student_lessons[s['id']],  # Most remaining lessons
                                     s['id']  # Tie-breaker
                                 ))
            
            lesson_start = time
            lesson_end_time = time + selected_student['lesDuur']
            
            # Check if we need to add a long break to prevent 3+ hours of consecutive lessons
            adjusted_start = add_long_break_if_needed(used_time_slots[day], lesson_start, lesson_end_time, instructor, students)
            
            if adjusted_start != lesson_start:
                lesson_start = adjusted_start
                lesson_end_time = adjusted_start + selected_student['lesDuur']
            
            # Check if this time slot would overlap with existing lessons
            # Check for overlaps with existing lessons on this day
            overlaps = False
            for existing_lesson in used_time_slots[day]:
                existing_start = parse_time(existing_lesson['startTime'])
                existing_end = parse_time(existing_lesson['endTime'])
                
                # Check if there's an overlap
                if not (lesson_end_time <= existing_start or lesson_start >= existing_end):
                    overlaps = True
                    break
            
            # Also check if we have enough pause between lessons (only for non-block hours)
            if selected_student['lesDuur'] < 120:  # Only check pauses for normal hours
                for existing_lesson in used_time_slots[day]:
                    existing_start = parse_time(existing_lesson['startTime'])
                    existing_end = parse_time(existing_lesson['endTime'])
                    
                    # Check pause between this lesson and existing lesson
                    if lesson_end_time <= existing_start:
                        # New lesson ends before existing lesson starts
                        pause_time = existing_start - lesson_end_time
                        if pause_time < instructor['pauzeTussenLessen']:
                            overlaps = True
                            break
                    elif existing_end <= lesson_start:
                        # Existing lesson ends before new lesson starts
                        pause_time = lesson_start - existing_end
                        if pause_time < instructor['pauzeTussenLessen']:
                            overlaps = True
                            break
            
            if not overlaps:
                # Check if we can schedule a block hour (multiple consecutive lessons)
                lessons_to_schedule = 1
                if (can_schedule_block_hour(selected_student['id'], day, used_time_slots, instructor) and 
                    selected_student['lessenPerWeek'] - student_lessons[selected_student['id']] >= 2):
                    # Try to schedule a second consecutive lesson (no pause for block hours)
                    second_lesson_start = lesson_end_time  # No pause between consecutive lessons for same student
                    second_lesson_end = second_lesson_start + selected_student['lesDuur']
                    
                    # Check if second lesson fits in student's availability
                    student_start = parse_time(selected_student['beschikbaarheid'][day][0])
                    student_end = parse_time(selected_student['beschikbaarheid'][day][1])
                    
                    if (second_lesson_start >= student_start and 
                        second_lesson_end <= student_end and
                        second_lesson_end <= parse_time(instructor['beschikbareUren'][day][1])):
                        
                        # Check if second lesson overlaps with existing lessons
                        second_overlaps = False
                        for existing_lesson in used_time_slots[day]:
                            existing_start = parse_time(existing_lesson['startTime'])
                            existing_end = parse_time(existing_lesson['endTime'])
                            
                            if not (second_lesson_end <= existing_start or second_lesson_start >= existing_end):
                                second_overlaps = True
                                break
                        
                        if not second_overlaps:
                            lessons_to_schedule = 2
                
                # Create lesson(s)
                for i in range(lessons_to_schedule):
                    if i == 0:
                        current_start = lesson_start
                        current_end = lesson_end_time
                    else:
                        current_start = lesson_end_time  # No pause between consecutive lessons for same student
                        current_end = current_start + selected_student['lesDuur']
                    
                    lesson = {
                        "date": date,
                        "startTime": format_time(current_start),
                        "endTime": format_time(current_end),
                        "studentId": selected_student['id'],
                        "studentName": selected_student['naam'],
                        "notes": ""
                    }
                    
                    lessons.append(lesson)
                    used_time_slots[day].append(lesson)
                    student_lessons[selected_student['id']] += 1
                    student_lessons_per_day[selected_student['id']][day] += 1
                
                # Add 15-minute pause after block hour if this was a block hour
                if lessons_to_schedule > 1 or selected_student['lesDuur'] >= 120:
                    # This was a block hour, add 15-minute pause
                    block_end_time = lesson_end_time
                    if lessons_to_schedule > 1:
                        # Calculate the end time of the last lesson in the block
                        block_end_time = lesson_end_time + (lessons_to_schedule - 1) * selected_student['lesDuur']
                    
                    pause_start = block_end_time
                    pause_end = pause_start + instructor['langePauzeDuur']  # 15-minute pause
                    
                    # Check if pause fits within instructor's available hours
                    instructor_end = parse_time(instructor['beschikbareUren'][day][1])
                    if pause_end <= instructor_end:
                        pause_lesson = {
                            "date": date,
                            "startTime": format_time(pause_start),
                            "endTime": format_time(pause_end),
                            "studentId": "PAUSE",
                            "studentName": "Pauze na blokuur",
                            "notes": ""
                        }
                        
                        lessons.append(pause_lesson)
                        used_time_slots[day].append(pause_lesson)
                        # if print_details:
                        #     print(f"  [15 minuten pauze toegevoegd na blokuur]")
                
                # Print lesson in requested format
                day_name = day.capitalize()
                lesson_type = " (blokuur)" if selected_student['lesDuur'] >= 120 else ""
                # Don't print here, we'll print all lessons in chronological order later
                # print(f"{day_name} {format_time(lesson_start)} - {format_time(lesson_end_time)} {selected_student['naam']}{lesson_type}")
    
    # Try to fit remaining lessons by being more flexible
    remaining_students = [s for s in students if student_lessons[s['id']] < s['lessenPerWeek']]
    
    # Sort remaining students to prioritize block hours first
    remaining_students.sort(key=lambda s: (
        not can_schedule_block_hour(s['id'], 'maandag', used_time_slots, instructor),  # Block hours first (False < True, so block hours come first)
        -(s['lessenPerWeek'] - student_lessons[s['id']])  # Then by most remaining lessons
    ))
    
    if remaining_students:
        # Try to fit remaining lessons by finding gaps in the schedule
        for student in remaining_students:
            remaining_lessons = student['lessenPerWeek'] - student_lessons[student['id']]
            
            for day, date in week_dates.items():
                if remaining_lessons <= 0:
                    break
                    
                if (day not in instructor['beschikbareUren'] or 
                    day not in student['beschikbaarheid'] or
                    not instructor['beschikbareUren'][day] or 
                    len(instructor['beschikbareUren'][day]) < 2):
                    continue
                
                # Check if student can schedule a lesson on this day
                can_schedule = False
                # Always try block hours first if possible
                if can_schedule_block_hour(student['id'], day, used_time_slots, instructor):
                    can_schedule = True
                elif can_schedule_normal_hour(student['id'], day, used_time_slots, instructor):
                    can_schedule = True
                
                if not can_schedule:
                    continue
                
                # Find gaps in the schedule where we can fit a lesson
                instructor_start = parse_time(instructor['beschikbareUren'][day][0])
                instructor_end = parse_time(instructor['beschikbareUren'][day][1])
                student_start = parse_time(student['beschikbaarheid'][day][0])
                student_end = parse_time(student['beschikbaarheid'][day][1])
                
                # Get all lessons for this day and sort by start time
                day_lessons = sorted(used_time_slots[day], key=lambda x: x['startTime'])
                
                # Try to fit lesson at the beginning of the day
                if not day_lessons:
                    lesson_start = max(instructor_start, student_start)
                    lesson_end_time = lesson_start + student['lesDuur']
                    
                    if lesson_end_time <= min(instructor_end, student_end):
                        lesson = {
                            "date": date,
                            "startTime": format_time(lesson_start),
                            "endTime": format_time(lesson_end_time),
                            "studentId": student['id'],
                            "studentName": student['naam'],
                            "notes": ""
                        }
                        
                        lessons.append(lesson)
                        used_time_slots[day].append(lesson)
                        student_lessons[student['id']] += 1
                        remaining_lessons -= 1
                        
                        # Add 15-minute pause after block hour if this was a block hour
                        if student['lesDuur'] >= 120:
                            # This was a block hour, add 15-minute pause
                            pause_start = lesson_end_time
                            pause_end = pause_start + instructor['langePauzeDuur']  # 15-minute pause
                            
                            # Check if pause fits within instructor's available hours
                            instructor_end = parse_time(instructor['beschikbareUren'][day][1])
                            if pause_end <= instructor_end:
                                pause_lesson = {
                                    "date": date,
                                    "startTime": format_time(pause_start),
                                    "endTime": format_time(pause_end),
                                    "studentId": "PAUSE",
                                    "studentName": "Pauze na blokuur",
                                    "notes": ""
                                }
                                
                                lessons.append(pause_lesson)
                                used_time_slots[day].append(pause_lesson)
                                if print_details:
                                    print(f"  [15 minuten pauze toegevoegd na blokuur]")
                        
                        # Don't print here, we'll print all lessons in chronological order later
                        # day_name = day.capitalize()
                        # lesson_type = " (blokuur)" if student['lesDuur'] >= 120 else ""
                        # print(f"{day_name} {format_time(lesson_start)} - {format_time(lesson_end_time)} {student['naam']}{lesson_type}")
                        continue
                
                # Try to fit lesson between existing lessons
                for i in range(len(day_lessons)):
                    current_lesson_end = parse_time(day_lessons[i]['endTime'])
                    
                    if i == len(day_lessons) - 1:
                        # Last lesson of the day, try to fit after it
                        next_start = instructor_end
                    else:
                        next_start = parse_time(day_lessons[i + 1]['startTime'])
                    
                    # Check if there's enough space for a lesson with proper pauses (only for normal hours)
                    if student['lesDuur'] >= 120:
                        # Block hour - no pause required
                        available_start = current_lesson_end
                        available_end = next_start
                    else:
                        # Normal hour - pause required
                        available_start = current_lesson_end + instructor['pauzeTussenLessen']
                        available_end = next_start
                    
                    if available_end - available_start >= student['lesDuur']:
                        lesson_start = max(available_start, student_start)
                        lesson_end_time = lesson_start + student['lesDuur']
                        
                        # Check if we need to add a long break
                        adjusted_start = add_long_break_if_needed(used_time_slots[day], lesson_start, lesson_end_time, instructor, students)
                        
                        if adjusted_start != lesson_start:
                            lesson_start = adjusted_start
                            lesson_end_time = adjusted_start + student['lesDuur']
                        
                        if lesson_end_time <= min(available_end, student_end):
                            lesson = {
                                "date": date,
                                "startTime": format_time(lesson_start),
                                "endTime": format_time(lesson_end_time),
                                "studentId": student['id'],
                                "studentName": student['naam'],
                                "notes": ""
                            }
                            
                            lessons.append(lesson)
                            used_time_slots[day].append(lesson)
                            student_lessons[student['id']] += 1
                            remaining_lessons -= 1
                            
                            # Add 15-minute pause after block hour if this was a block hour
                            if student['lesDuur'] >= 120:
                                # This was a block hour, add 15-minute pause
                                pause_start = lesson_end_time
                                pause_end = pause_start + instructor['langePauzeDuur']  # 15-minute pause
                                
                                # Check if pause fits within instructor's available hours
                                instructor_end = parse_time(instructor['beschikbareUren'][day][1])
                                if pause_end <= instructor_end:
                                    pause_lesson = {
                                        "date": date,
                                        "startTime": format_time(pause_start),
                                        "endTime": format_time(pause_end),
                                        "studentId": "PAUSE",
                                        "studentName": "Pauze na blokuur",
                                        "notes": ""
                                    }
                                    
                                    lessons.append(pause_lesson)
                                    used_time_slots[day].append(pause_lesson)
                                    if print_details:
                                        print(f"  [15 minuten pauze toegevoegd na blokuur]")
                            
                            # Don't print here, we'll print all lessons in chronological order later
                            # day_name = day.capitalize()
                            # lesson_type = " (blokuur)" if student['lesDuur'] >= 120 else ""
                            # print(f"{day_name} {format_time(lesson_start)} - {format_time(lesson_end_time)} {student['naam']}{lesson_type}")
                            break
    
    # Print all lessons in chronological order from Monday morning to Friday evening
    if print_details:
        print("=== LESSEN IN CHRONOLOGISCHE VOLGORDE ===")
    
    # Create a mapping from day names to sort order
    day_order = {'maandag': 1, 'dinsdag': 2, 'woensdag': 3, 'donderdag': 4, 'vrijdag': 5, 'zaterdag': 6, 'zondag': 7}
    
    # Add day name to each lesson for sorting
    for lesson in lessons:
        for day, date in week_dates.items():
            if date == lesson['date']:
                lesson['day_name'] = day
                break
    
    # Sort lessons by day and time according to the current week variation
    current_day_order = {day: i for i, day in enumerate(day_variations[random_week_index])}
    sorted_lessons = sorted(lessons, key=lambda x: (
        current_day_order.get(x['day_name'], 999),  # Sort by day first
        x['startTime']  # Then by start time
    ))
    
    # Print lessons in chronological order
    if print_details:
        for lesson in sorted_lessons:
            day_name = lesson['day_name'].capitalize()
            
            # Handle pause lessons
            if lesson['studentId'] == "PAUSE":
                print(f"{day_name} {lesson['startTime']} - {lesson['endTime']} {lesson['studentName']}")
                continue
            
            # Determine if this is a block hour
            lesson_duration = parse_time(lesson['endTime']) - parse_time(lesson['startTime'])
            
            # Check if this student has multiple lessons on this day (block hour)
            day_lessons_for_student = [l for l in sorted_lessons if l['studentId'] == lesson['studentId'] and l['day_name'] == lesson['day_name'] and l['studentId'] != "PAUSE"]
            is_block_hour = lesson_duration >= 120 or len(day_lessons_for_student) > 1
            
            lesson_type = " (blokuur)" if is_block_hour else ""
            
            print(f"{day_name} {lesson['startTime']} - {lesson['endTime']} {lesson['studentName']}{lesson_type}")
        
        print("=== EINDE LESSEN ===")
    
    # Calculate total required lessons
    total_required_lessons = sum(student['lessenPerWeek'] for student in students)
    total_planned_lessons = len([lesson for lesson in lessons if lesson['studentId'] != "PAUSE"])
    
    # Create summary
    summary = f"Planning voor komende week: {total_planned_lessons}/{total_required_lessons} lessen ingepland"
    
    # Calculate total time between lessons
    total_time_between_lessons = 0
    
    # Group lessons by day (excluding pause lessons for time calculation)
    lessons_by_day = {}
    for lesson in lessons:
        if lesson['studentId'] == "PAUSE":
            continue
        day = lesson['date']
        if day not in lessons_by_day:
            lessons_by_day[day] = []
        lessons_by_day[day].append(lesson)
    
    # Calculate time between lessons for each day
    for day, day_lessons in lessons_by_day.items():
        # Sort lessons by start time
        day_lessons.sort(key=lambda x: x['startTime'])
        
        # Calculate gaps between consecutive lessons
        for i in range(len(day_lessons) - 1):
            current_lesson_end = parse_time(day_lessons[i]['endTime'])
            next_lesson_start = parse_time(day_lessons[i + 1]['startTime'])
            gap_minutes = next_lesson_start - current_lesson_end
            total_time_between_lessons += gap_minutes

    
    
    # Print summary
    if print_details:
        print(f"\n{total_planned_lessons}/{total_required_lessons} lessen ingepland")
        print(f"Totale tijd tussen lessen: {total_time_between_lessons} minuten")
    
    # Check and print students who didn't get their desired number of lessons
    students_with_missing_lessons = []
    for student in students:
        if student_lessons[student['id']] < student['lessenPerWeek']:
            missing_lessons = student['lessenPerWeek'] - student_lessons[student['id']]
            students_with_missing_lessons.append((student['naam'], missing_lessons))
            warnings.append(f"Student {student['naam']} heeft nog {missing_lessons} les(sen) nodig")
    
    if print_details:
        if students_with_missing_lessons:
            print(f"\nLeerlingen die niet het gewenste aantal lessen hebben gekregen:")
            for student_name, missing_count in students_with_missing_lessons:
                print(f"  - {student_name}: {missing_count} les(sen) tekort")
        else:
            print(f"\nAlle leerlingen hebben het gewenste aantal lessen gekregen!")
    
    # Return JSON response
    response = {
        "lessons": lessons,
        "summary": summary,
        "warnings": warnings
    }
    
    return response, total_planned_lessons, total_time_between_lessons, start_vanaf_begin

def create_output_json(best_result, best_week_index, best_start_vanaf_begin, filename="../src/app/dashboard/ai-schedule/ai-weekplanning-testoutput.json"):
    """
    Create a JSON file in the exact format of sample_output.json from the best week planning results.
    
    Args:
        best_result: The result dictionary from generate_week_planning
        best_week_index: The index of the best week variation
        best_start_vanaf_begin: Whether the best option started from beginning
        filename: The output filename (default: best_week_planning.json)
    """
    # Load input data to get student information
    with open('sample_input.json', 'r', encoding='utf-8') as f:
        input_data = json.load(f)
    
    students = input_data['leerlingen']
    
    # Create student lookup dictionary
    student_lookup = {student['id']: student['naam'] for student in students}
    
    # Filter out pause lessons and format lessons according to sample_output.json format
    formatted_lessons = []
    for lesson in best_result['lessons']:
        if lesson['studentId'] != "PAUSE":  # Skip pause lessons
            formatted_lesson = {
                "date": lesson['date'],
                "startTime": lesson['startTime'],
                "endTime": lesson['endTime'],
                "studentId": lesson['studentId'],
                "studentName": lesson['studentName'],
                "notes": ""
            }
            formatted_lessons.append(formatted_lesson)
    
    # Sort lessons in chronological order from Monday morning to Sunday evening
    # Define the standard week order for sorting
    standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
    
    # Create a mapping from dates to day names for sorting
    date_to_day = {}
    for i, day in enumerate(standard_week_order):
        if i < len(input_data['instructeur']['datums']):
            date_to_day[input_data['instructeur']['datums'][i]] = day
    
    # Sort lessons by date (day of week) and then by start time
    formatted_lessons.sort(key=lambda x: (
        standard_week_order.index(date_to_day.get(x['date'], 'zondag')),  # Sort by day of week
        x['startTime']  # Then by start time
    ))
    
    # Calculate students without lessons
    students_without_lessons = {}
    for student in students:
        student_lessons_count = len([l for l in formatted_lessons if l['studentId'] == student['id']])
        missing_lessons = student['lessenPerWeek'] - student_lessons_count
        if missing_lessons > 0:
            students_without_lessons[student['naam']] = missing_lessons
    
    # Calculate total time between lessons (excluding pause lessons)
    total_time_between_lessons = 0
    lessons_by_day = {}
    
    for lesson in best_result['lessons']:
        if lesson['studentId'] == "PAUSE":
            continue
        day = lesson['date']
        if day not in lessons_by_day:
            lessons_by_day[day] = []
        lessons_by_day[day].append(lesson)
    
    for day, day_lessons in lessons_by_day.items():
        day_lessons.sort(key=lambda x: x['startTime'])
        for i in range(len(day_lessons) - 1):
            current_lesson_end = parse_time(day_lessons[i]['endTime'])
            next_lesson_start = parse_time(day_lessons[i + 1]['startTime'])
            gap_minutes = next_lesson_start - current_lesson_end
            total_time_between_lessons += gap_minutes
    
    # Create the output structure matching sample_output.json format
    output_data = {
        "lessons": formatted_lessons,
        "leerlingen_zonder_les": students_without_lessons,
        "schedule_details": {
            "lessen": len(formatted_lessons),
            "totale_minuten_tussen_lessen": total_time_between_lessons
        }
    }
    
    # Write to JSON file
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"JSON bestand '{filename}' succesvol aangemaakt!")
    print(f"Aantal lessen: {len(formatted_lessons)}")
    print(f"Totale minuten tussen lessen: {total_time_between_lessons}")
    print(f"Leerlingen zonder voldoende lessen: {len(students_without_lessons)}")

if __name__ == "__main__":
    print("=== VERGELIJKING VAN 20 VERSCHILLENDE DAG VOLGORDES ===")
    print()

    day_variations = [
    ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
    ['dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag'],
    ['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag'],
    ['donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag'],
    ['vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag'],
    ['zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'],
    ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    ]

    days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
    list_available_days_integers = []
    # Read on which days the instructor is available
    for i in range(7):
        # read json file 
        with open('sample_input.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        if(days[i] in data['instructeur']['beschikbareUren']):
            if(len(data['instructeur']['beschikbareUren'][days[i]]) > 0):
                list_available_days_integers.append(i)

    print(list_available_days_integers)
    total_combinations = factorial(len(list_available_days_integers))
    print(f"Aantal mogelijke combinaties: {total_combinations}")
    available_days = len(list_available_days_integers)
    # Add every single combination of days
    for combination_index in range(min(100, total_combinations)):
        remaining_days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
        new_combination = []
        for day_index in range(7):
            selected_day = remaining_days[random.randint(0, len(remaining_days)-1)]
            new_combination.append(selected_day)
            remaining_days.remove(selected_day)
        day_variations.append(new_combination)
        print(f"Combinatie {combination_index + 1}: {new_combination}")
    
    results = []
    highest_score = 0
    best_week_index = 0
    best_rest_time = float('inf')  # Initialize with infinity for tiebreaker
    best_start_vanaf_begin = False
    for i in range(len(day_variations)):
        print(f"--- OPTIE {i+1} ---")
        # Get the first 5 days from each variation (work week)
        day_order = day_variations[i]
        print(f"Dag volgorde: {day_order}")
        print()
        random_start_vanaf_begin = [True, False][random.randint(0, 1)]

        result, score, total_time_between_lessons, start_vanaf_begin = generate_week_planning(i, random_start_vanaf_begin, print_details=False)
        results.append((i, score, total_time_between_lessons, result))
        
        # Update best option: prioritize number of lessons, then use rest time as tiebreaker
        if score > highest_score or (score == highest_score and total_time_between_lessons < best_rest_time):
            highest_score = score
            best_week_index = i
            best_rest_time = total_time_between_lessons
            best_start_vanaf_begin = start_vanaf_begin
        
        print(f"Optie {i+1}: {score} lessen ingepland")
        print("="*50)
        print()
    
    print("=== SAMENVATTING VAN ALLE OPTIES ===")
    print()
    
    for i, score, total_time_between_lessons, result in results:
        day_order = day_variations[i]
        print(f"Optie {i+1} ({' -> '.join(day_order)}): {score} lessen, {total_time_between_lessons} minuten rust")
    
    print()
    print(f"BESTE OPTIE: Optie {best_week_index+1} met {highest_score} lessen en {best_rest_time} minuten rust")
    print()
    print("=== DETAILS VAN BESTE OPTIE ===")
    print()
    
    # Show details of the best option
    print(f"Optie {best_week_index+1} details:")
    print(f"Dag volgorde: {day_variations[best_week_index]}")
    print(f"Start vanaf begin: {best_start_vanaf_begin}")
    print()
    
    # Re-run the best option with details
    best_result, best_score, best_rest_time, best_start_vanaf_begin = generate_week_planning(best_week_index, best_start_vanaf_begin, print_details=True)
    
    # Create JSON output file
    print("\n=== JSON BESTAND AANMAKEN ===")
    create_output_json(best_result, best_week_index, best_start_vanaf_begin)
