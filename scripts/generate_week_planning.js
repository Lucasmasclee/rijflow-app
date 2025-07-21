const fs = require('fs');

// Define the day order variations that match get_next_week_dates function
let day_variations = [];

function parse_time(time_str) {
    // Parse time string in HH:MM format to minutes since midnight
    const [hours, minutes] = time_str.split(':').map(Number);
    return hours * 60 + minutes;
}

function format_time(minutes) {
    // Convert minutes since midnight to HH:MM format
    const hours = Math.floor(minutes / 60);
    const minutes_remainder = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes_remainder.toString().padStart(2, '0')}`;
}

function get_next_week_dates(random_week_index, instructor) {
    // Get the dates for the week based on the dates provided in the input file
    const week_dates = {};
    
    // Get the dates from the instructor data
    const datums = instructor.datums || [];
    
    // Define the standard week order that corresponds to the dates in the input file
    // The dates array follows the standard week order: Monday to Sunday
    const standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    
    // Map the standard week order to the provided dates
    for (let i = 0; i < standard_week_order.length; i++) {
        const day = standard_week_order[i];
        if (i < datums.length) {
            week_dates[day] = datums[i];
        } else {
            // Fallback: calculate date if not enough dates provided
            const today = new Date();
            const days_ahead = 7 - today.getDay(); // Days until Monday
            const next_monday = new Date(today);
            next_monday.setDate(today.getDate() + (days_ahead <= 0 ? days_ahead + 7 : days_ahead));
            const date = new Date(next_monday);
            date.setDate(next_monday.getDate() + i);
            week_dates[day] = date.toISOString().split('T')[0];
        }
    }
    
    return week_dates;
}

function check_consecutive_lessons_time(day_lessons, new_lesson_start, new_lesson_end, instructor) {
    // Check if adding a new lesson would create more than 3 hours of consecutive lessons.
    // Returns True if a long break is needed, False otherwise.
    if (day_lessons.length === 0) {
        return false;
    }
    
    // Sort existing lessons by start time
    const sorted_lessons = day_lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Find lessons that would be consecutive with the new lesson
    const consecutive_lessons = [];
    
    for (const lesson of sorted_lessons) {
        const lesson_start = parse_time(lesson.startTime);
        const lesson_end = parse_time(lesson.endTime);
        
        // Check if this lesson would be consecutive with the new lesson
        // (no gap or gap less than minimum pause)
        if (lesson_end <= new_lesson_start && 
            new_lesson_start - lesson_end < instructor.pauzeTussenLessen) {
            consecutive_lessons.push(lesson);
        } else if (new_lesson_end <= lesson_start && 
                  lesson_start - new_lesson_end < instructor.pauzeTussenLessen) {
            consecutive_lessons.push(lesson);
        }
    }
    
    if (consecutive_lessons.length === 0) {
        return false;
    }
    
    // Calculate total consecutive time
    const all_lessons = [...consecutive_lessons, {startTime: format_time(new_lesson_start), endTime: format_time(new_lesson_end)}];
    all_lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    const total_consecutive_time = parse_time(all_lessons[all_lessons.length - 1].endTime) - parse_time(all_lessons[0].startTime);
    
    // Check if we would exceed 3 hours (180 minutes)
    if (total_consecutive_time >= 180) {
        return true;
    }
    
    return false;
}

function add_long_break_if_needed(day_lessons, new_lesson_start, new_lesson_end, instructor, students, print_details) {
    // Add a 20-minute long break if adding a lesson would create more than 3 hours of consecutive lessons.
    // Returns the adjusted start time for the new lesson.
    if (!check_consecutive_lessons_time(day_lessons, new_lesson_start, new_lesson_end, instructor)) {
        return new_lesson_start;
    }
    
    // Find the best place to insert the long break
    const sorted_lessons = day_lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Find the lesson that would come before the new lesson
    let prev_lesson = null;
    for (const lesson of sorted_lessons) {
        const lesson_end = parse_time(lesson.endTime);
        if (lesson_end <= new_lesson_start) {
            prev_lesson = lesson;
        }
    }
    
    if (prev_lesson) {
        // Insert break after the previous lesson
        const break_start = parse_time(prev_lesson.endTime) + instructor.pauzeTussenLessen;
        const break_end = break_start + instructor.langePauzeDuur;
        
        // Adjust new lesson start time
        const adjusted_start = break_end + instructor.pauzeTussenLessen;
        
        if (print_details) {
            // console.log(`  [Lange pauze van ${instructor.langePauzeDuur} minuten toegevoegd]`);
        }
        return adjusted_start;
    }
    
    return new_lesson_start;
}

function can_schedule_block_hour(student_id, day, used_time_slots, instructor) {
    // Check if a student can schedule a block hour (2 consecutive lessons) on a given day.
    // Returns True if possible, False otherwise.
    if (!instructor.blokuren) {
        return false;
    }
    
    // Check if student already has lessons on this day
    const day_lessons = used_time_slots[day].filter(lesson => lesson.studentId === student_id);
    
    if (day_lessons.length > 0) {
        return false; // Student already has lessons on this day
    }
    
    return true;
}

function can_schedule_normal_hour(student_id, day, used_time_slots, instructor) {
    // Check if a student can schedule a normal hour on a given day.
    // Returns True if possible, False otherwise.
    // Check if student already has lessons on this day
    const day_lessons = used_time_slots[day].filter(lesson => lesson.studentId === student_id);
    
    if (day_lessons.length === 0) {
        return true; // No lessons yet, can schedule normal hour
    }
    
    // If blokuren is not enabled, can't have multiple lessons per day
    if (!instructor.blokuren) {
        return false;
    }
    
    // If student already has any lessons on this day, can't schedule more
    // (either they already have a normal hour or a block hour)
    return false;
} 

function generate_week_planning(random_week_index, start_vanaf_begin, print_details = true) {
    // Generate optimized week planning maximizing number of lessons
    
    // Load input data
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    const instructor = data.instructeur;
    const students = data.leerlingen;
    
    // Get next week dates
    const week_dates = get_next_week_dates(random_week_index, instructor);
    
    const lessons = [];
    const warnings = [];
    
    // Track lessons per student
    const student_lessons = {};
    for (const student of students) {
        student_lessons[student.id] = 0;
    }
    
    // Track lessons per student per day to ensure max 1 lesson per day (or block hour)
    const student_lessons_per_day = {};
    for (const student of students) {
        student_lessons_per_day[student.id] = {};
        for (const day of Object.keys(week_dates)) {
            student_lessons_per_day[student.id][day] = 0;
        }
    }
    
    // Track used time slots per day to prevent overlaps
    const used_time_slots = {};
    for (const day of Object.keys(week_dates)) {
        used_time_slots[day] = [];
    }
    
    // Create all possible time slots with 5-minute intervals
    const all_time_slots = [];
    
    for (const [day, date] of Object.entries(week_dates)) {
        if (!(day in instructor.beschikbareUren)) {
            continue;
        }
        
        // Check if the day has available hours (not empty array)
        if (!instructor.beschikbareUren[day] || instructor.beschikbareUren[day].length < 2) {
            continue;
        }
        
        const instructor_start = parse_time(instructor.beschikbareUren[day][0]);
        const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
        
        // Create time slots every 5 minutes
        let current_time;
        if (start_vanaf_begin) {
            current_time = instructor_start;
        } else {
            current_time = instructor_end;
        }
        
        while ((start_vanaf_begin && current_time < instructor_end) || (!start_vanaf_begin && current_time > instructor_start)) {
            // Find all students available at this time
            const available_students = [];
            
            for (const student of students) {
                if (student_lessons[student.id] < student.lessenPerWeek && 
                    day in student.beschikbaarheid) {
                    
                    const student_start = parse_time(student.beschikbaarheid[day][0]);
                    const student_end = parse_time(student.beschikbaarheid[day][1]);
                    
                    // Check if student can schedule a lesson on this day
                    let can_schedule = false;
                    
                    // Always try block hours first if possible
                    if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
                        // Can schedule block hour (either single long lesson or multiple consecutive short lessons)
                        if (student_start <= current_time && current_time + student.lesDuur <= student_end) {
                            can_schedule = true;
                        }
                    } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
                        // Can schedule normal hour
                        if (student_start <= current_time && current_time + student.lesDuur <= student_end) {
                            can_schedule = true;
                        }
                    }
                    
                    if (can_schedule) {
                        available_students.push(student);
                    }
                }
            }
            
            if (available_students.length > 0) {
                all_time_slots.push({
                    day: day,
                    date: date,
                    time: current_time,
                    available_students: [...available_students]
                });
            }
            
            if (start_vanaf_begin) {
                current_time += 5;
            } else {
                current_time -= 5;
            }
        }
    }
    
    // Sort time slots by priority:
    // 1. Day (according to the current week variation)
    // 2. Time (earlier is better)
    // Create a mapping from day names to their position in the current week variation
    const current_day_order_slots = {};
    for (let i = 0; i < day_variations[random_week_index].length; i++) {
        current_day_order_slots[day_variations[random_week_index][i]] = i;
    }
    all_time_slots.sort((a, b) => {
        const day_a = current_day_order_slots[a.day] || 999;
        const day_b = current_day_order_slots[b.day] || 999;
        if (day_a !== day_b) return day_a - day_b;
        return a.time - b.time;
    });
    
    // Greedy algorithm: assign lessons to time slots
    for (const slot of all_time_slots) {
        const day = slot.day;
        const date = slot.date;
        const time = slot.time;
        
        // Filter available students (some might have been assigned in previous slots)
        const available_students = [];
        for (const student of slot.available_students) {
            if (student_lessons[student.id] < student.lessenPerWeek) {
                // Check if student can still schedule a lesson on this day
                let can_schedule = false;
                
                // Always try block hours first if possible
                if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
                    can_schedule = true;
                } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
                    can_schedule = true;
                }
                
                if (can_schedule) {
                    available_students.push(student);
                }
            }
        }
        
        if (available_students.length > 0) {
            // Select student with highest priority:
            // 1. Block hours first (highest priority) - students who can schedule block hours
            // 2. Most remaining lessons (second priority)
            // 3. Student ID for tie-breaking
            const selected_student = available_students.reduce((max, s) => {
                const max_block = can_schedule_block_hour(max.id, day, used_time_slots, instructor);
                const s_block = can_schedule_block_hour(s.id, day, used_time_slots, instructor);
                const max_remaining = max.lessenPerWeek - student_lessons[max.id];
                const s_remaining = s.lessenPerWeek - student_lessons[s.id];
                
                if (s_block !== max_block) return s_block ? s : max;
                if (s_remaining !== max_remaining) return s_remaining > max_remaining ? s : max;
                return s.id > max.id ? s : max;
            });
            
            let lesson_start = time;
            let lesson_end_time = time + selected_student.lesDuur;
            
            // Check if we need to add a long break to prevent 3+ hours of consecutive lessons
            const adjusted_start = add_long_break_if_needed(used_time_slots[day], lesson_start, lesson_end_time, instructor, students, print_details);
            
            if (adjusted_start !== lesson_start) {
                lesson_start = adjusted_start;
                lesson_end_time = adjusted_start + selected_student.lesDuur;
            }
            
            // Check if this time slot would overlap with existing lessons
            // Check for overlaps with existing lessons on this day
            let overlaps = false;
            for (const existing_lesson of used_time_slots[day]) {
                const existing_start = parse_time(existing_lesson.startTime);
                const existing_end = parse_time(existing_lesson.endTime);
                
                // Check if there's an overlap
                if (!(lesson_end_time <= existing_start || lesson_start >= existing_end)) {
                    overlaps = true;
                    break;
                }
            }
            
            // Also check if we have enough pause between lessons (only for non-block hours)
            if (selected_student.lesDuur < 120) { // Only check pauses for normal hours
                for (const existing_lesson of used_time_slots[day]) {
                    const existing_start = parse_time(existing_lesson.startTime);
                    const existing_end = parse_time(existing_lesson.endTime);
                    
                    // Check pause between this lesson and existing lesson
                    if (lesson_end_time <= existing_start) {
                        // New lesson ends before existing lesson starts
                        const pause_time = existing_start - lesson_end_time;
                        if (pause_time < instructor.pauzeTussenLessen) {
                            overlaps = true;
                            break;
                        }
                    } else if (existing_end <= lesson_start) {
                        // Existing lesson ends before new lesson starts
                        const pause_time = lesson_start - existing_end;
                        if (pause_time < instructor.pauzeTussenLessen) {
                            overlaps = true;
                            break;
                        }
                    }
                }
            }
            
            if (!overlaps) {
                // Check if we can schedule a block hour (multiple consecutive lessons)
                let lessons_to_schedule = 1;
                if (can_schedule_block_hour(selected_student.id, day, used_time_slots, instructor) && 
                    selected_student.lessenPerWeek - student_lessons[selected_student.id] >= 2) {
                    // Try to schedule a second consecutive lesson (no pause for block hours)
                    const second_lesson_start = lesson_end_time; // No pause between consecutive lessons for same student
                    const second_lesson_end = second_lesson_start + selected_student.lesDuur;
                    
                    // Check if second lesson fits in student's availability
                    const student_start = parse_time(selected_student.beschikbaarheid[day][0]);
                    const student_end = parse_time(selected_student.beschikbaarheid[day][1]);
                    
                    if (second_lesson_start >= student_start && 
                        second_lesson_end <= student_end &&
                        second_lesson_end <= parse_time(instructor.beschikbareUren[day][1])) {
                        
                        // Check if second lesson overlaps with existing lessons
                        let second_overlaps = false;
                        for (const existing_lesson of used_time_slots[day]) {
                            const existing_start = parse_time(existing_lesson.startTime);
                            const existing_end = parse_time(existing_lesson.endTime);
                            
                            if (!(second_lesson_end <= existing_start || second_lesson_start >= existing_end)) {
                                second_overlaps = true;
                                break;
                            }
                        }
                        
                        if (!second_overlaps) {
                            lessons_to_schedule = 2;
                        }
                    }
                }
                
                // Create lesson(s)
                for (let i = 0; i < lessons_to_schedule; i++) {
                    let current_start, current_end;
                    if (i === 0) {
                        current_start = lesson_start;
                        current_end = lesson_end_time;
                    } else {
                        current_start = lesson_end_time; // No pause between consecutive lessons for same student
                        current_end = current_start + selected_student.lesDuur;
                    }
                    
                    const lesson = {
                        date: date,
                        startTime: format_time(current_start),
                        endTime: format_time(current_end),
                        studentId: selected_student.id,
                        studentName: selected_student.naam,
                        notes: ""
                    };
                    
                    lessons.push(lesson);
                    used_time_slots[day].push(lesson);
                    student_lessons[selected_student.id] += 1;
                    student_lessons_per_day[selected_student.id][day] += 1;
                }
                
                // Add 15-minute pause after block hour if this was a block hour
                if (lessons_to_schedule > 1 || selected_student.lesDuur >= 120) {
                    // This was a block hour, add 15-minute pause
                    let block_end_time = lesson_end_time;
                    if (lessons_to_schedule > 1) {
                        // Calculate the end time of the last lesson in the block
                        block_end_time = lesson_end_time + (lessons_to_schedule - 1) * selected_student.lesDuur;
                    }
                    
                    const pause_start = block_end_time;
                    const pause_end = pause_start + instructor.langePauzeDuur; // 15-minute pause
                    
                    // Check if pause fits within instructor's available hours
                    const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
                    if (pause_end <= instructor_end) {
                        const pause_lesson = {
                            date: date,
                            startTime: format_time(pause_start),
                            endTime: format_time(pause_end),
                            studentId: "PAUSE",
                            studentName: "Pauze na blokuur",
                            notes: ""
                        };
                        
                        lessons.push(pause_lesson);
                        used_time_slots[day].push(pause_lesson);
                    }
                }
            }
        }
    } 
    
    // Try to fit remaining lessons by being more flexible
    const remaining_students = students.filter(s => student_lessons[s.id] < s.lessenPerWeek);
    
    // Sort remaining students to prioritize block hours first
    remaining_students.sort((a, b) => {
        const a_block = can_schedule_block_hour(a.id, 'maandag', used_time_slots, instructor);
        const b_block = can_schedule_block_hour(b.id, 'maandag', used_time_slots, instructor);
        if (a_block !== b_block) return a_block ? -1 : 1; // Block hours first
        return -(a.lessenPerWeek - student_lessons[a.id]) + (b.lessenPerWeek - student_lessons[b.id]); // Then by most remaining lessons
    });
    
    if (remaining_students.length > 0) {
        // Try to fit remaining lessons by finding gaps in the schedule
        for (const student of remaining_students) {
            let remaining_lessons = student.lessenPerWeek - student_lessons[student.id];
            
            for (const [day, date] of Object.entries(week_dates)) {
                if (remaining_lessons <= 0) {
                    break;
                }
                
                if (!(day in instructor.beschikbareUren) || 
                    !(day in student.beschikbaarheid) ||
                    !instructor.beschikbareUren[day] || 
                    instructor.beschikbareUren[day].length < 2) {
                    continue;
                }
                
                // Check if student can schedule a lesson on this day
                let can_schedule = false;
                // Always try block hours first if possible
                if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
                    can_schedule = true;
                } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
                    can_schedule = true;
                }
                
                if (!can_schedule) {
                    continue;
                }
                
                // Find gaps in the schedule where we can fit a lesson
                const instructor_start = parse_time(instructor.beschikbareUren[day][0]);
                const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
                const student_start = parse_time(student.beschikbaarheid[day][0]);
                const student_end = parse_time(student.beschikbaarheid[day][1]);
                
                // Get all lessons for this day and sort by start time
                const day_lessons = used_time_slots[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
                
                // Try to fit lesson at the beginning of the day
                if (day_lessons.length === 0) {
                    const lesson_start = Math.max(instructor_start, student_start);
                    const lesson_end_time = lesson_start + student.lesDuur;
                    
                    if (lesson_end_time <= Math.min(instructor_end, student_end)) {
                        const lesson = {
                            date: date,
                            startTime: format_time(lesson_start),
                            endTime: format_time(lesson_end_time),
                            studentId: student.id,
                            studentName: student.naam,
                            notes: ""
                        };
                        
                        lessons.push(lesson);
                        used_time_slots[day].push(lesson);
                        student_lessons[student.id] += 1;
                        remaining_lessons -= 1;
                        
                        // Add 15-minute pause after block hour if this was a block hour
                        if (student.lesDuur >= 120) {
                            // This was a block hour, add 15-minute pause
                            const pause_start = lesson_end_time;
                            const pause_end = pause_start + instructor.langePauzeDuur; // 15-minute pause
                            
                            // Check if pause fits within instructor's available hours
                            const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
                            if (pause_end <= instructor_end) {
                                const pause_lesson = {
                                    date: date,
                                    startTime: format_time(pause_start),
                                    endTime: format_time(pause_end),
                                    studentId: "PAUSE",
                                    studentName: "Pauze na blokuur",
                                    notes: ""
                                };
                                
                                lessons.push(pause_lesson);
                                used_time_slots[day].push(pause_lesson);
                            }
                        }
                        continue;
                    }
                }
                
                // Try to fit lesson between existing lessons
                for (let i = 0; i < day_lessons.length; i++) {
                    const current_lesson_end = parse_time(day_lessons[i].endTime);
                    
                    let next_start;
                    if (i === day_lessons.length - 1) {
                        // Last lesson of the day, try to fit after it
                        next_start = instructor_end;
                    } else {
                        next_start = parse_time(day_lessons[i + 1].startTime);
                    }
                    
                    // Check if there's enough space for a lesson with proper pauses (only for normal hours)
                    let available_start, available_end;
                    if (student.lesDuur >= 120) {
                        // Block hour - no pause required
                        available_start = current_lesson_end;
                        available_end = next_start;
                    } else {
                        // Normal hour - pause required
                        available_start = current_lesson_end + instructor.pauzeTussenLessen;
                        available_end = next_start;
                    }
                    
                    if (available_end - available_start >= student.lesDuur) {
                        let lesson_start = Math.max(available_start, student_start);
                        let lesson_end_time = lesson_start + student.lesDuur;
                        
                        // Check if we need to add a long break
                        const adjusted_start = add_long_break_if_needed(used_time_slots[day], lesson_start, lesson_end_time, instructor, students, print_details);
                        
                        if (adjusted_start !== lesson_start) {
                            lesson_start = adjusted_start;
                            lesson_end_time = adjusted_start + student.lesDuur;
                        }
                        
                        if (lesson_end_time <= Math.min(available_end, student_end)) {
                            const lesson = {
                                date: date,
                                startTime: format_time(lesson_start),
                                endTime: format_time(lesson_end_time),
                                studentId: student.id,
                                studentName: student.naam,
                                notes: ""
                            };
                            
                            lessons.push(lesson);
                            used_time_slots[day].push(lesson);
                            student_lessons[student.id] += 1;
                            remaining_lessons -= 1;
                            
                            // Add 15-minute pause after block hour if this was a block hour
                            if (student.lesDuur >= 120) {
                                // This was a block hour, add 15-minute pause
                                const pause_start = lesson_end_time;
                                const pause_end = pause_start + instructor.langePauzeDuur; // 15-minute pause
                                
                                // Check if pause fits within instructor's available hours
                                const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
                                if (pause_end <= instructor_end) {
                                    const pause_lesson = {
                                        date: date,
                                        startTime: format_time(pause_start),
                                        endTime: format_time(pause_end),
                                        studentId: "PAUSE",
                                        studentName: "Pauze na blokuur",
                                        notes: ""
                                    };
                                    
                                    lessons.push(pause_lesson);
                                    used_time_slots[day].push(pause_lesson);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // Print all lessons in chronological order from Monday morning to Friday evening
    // Verwijder alle console.log statements behalve de JSON output
    // Create a mapping from day names to sort order
    const day_order = {maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, zondag: 7};
    
    // Add day name to each lesson for sorting
    for (const lesson of lessons) {
        for (const [day, date] of Object.entries(week_dates)) {
            if (date === lesson.date) {
                lesson.day_name = day;
                break;
            }
        }
    }
    
    // Sort lessons by day and time according to the current week variation
    const current_day_order = {};
    for (let i = 0; i < day_variations[random_week_index].length; i++) {
        current_day_order[day_variations[random_week_index][i]] = i;
    }
    const sorted_lessons = lessons.sort((a, b) => {
        const day_a = current_day_order[a.day_name] || 999;
        const day_b = current_day_order[b.day_name] || 999;
        if (day_a !== day_b) return day_a - day_b;
        return a.startTime.localeCompare(b.startTime);
    });
    
    // Print lessons in chronological order
    // Verwijder alle console.log statements behalve de JSON output
    // Calculate total required lessons
    const total_required_lessons = students.reduce((sum, student) => sum + student.lessenPerWeek, 0);
    const total_planned_lessons = lessons.filter(lesson => lesson.studentId !== "PAUSE").length;
    
    // Create summary
    const summary = `Planning voor komende week: ${total_planned_lessons}/${total_required_lessons} lessen ingepland`;
    
    // Calculate total time between lessons
    let total_time_between_lessons = 0;
    
    // Group lessons by day (excluding pause lessons for time calculation)
    const lessons_by_day = {};
    for (const lesson of lessons) {
        if (lesson.studentId === "PAUSE") {
            continue;
        }
        const day = lesson.date;
        if (!(day in lessons_by_day)) {
            lessons_by_day[day] = [];
        }
        lessons_by_day[day].push(lesson);
    }
    
    // Calculate time between lessons for each day
    for (const [day, day_lessons] of Object.entries(lessons_by_day)) {
        // Sort lessons by start time
        day_lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Calculate gaps between consecutive lessons
        for (let i = 0; i < day_lessons.length - 1; i++) {
            const current_lesson_end = parse_time(day_lessons[i].endTime);
            const next_lesson_start = parse_time(day_lessons[i + 1].startTime);
            const gap_minutes = next_lesson_start - current_lesson_end;
            total_time_between_lessons += gap_minutes;
        }
    }
    
    // Print summary
    // Verwijder alle console.log statements behalve de JSON output
    // Check and print students who didn't get their desired number of lessons
    const students_with_missing_lessons = [];
    for (const student of students) {
        if (student_lessons[student.id] < student.lessenPerWeek) {
            const missing_lessons = student.lessenPerWeek - student_lessons[student.id];
            students_with_missing_lessons.push([student.naam, missing_lessons]);
            warnings.push(`Student ${student.naam} heeft nog ${missing_lessons} les(sen) nodig`);
        }
    }
    
    // Verwijder alle console.log statements behalve de JSON output
    // Return JSON response
    const response = {
        lessons: lessons,
        summary: summary,
        warnings: warnings
    };
    
    return [response, total_planned_lessons, total_time_between_lessons, start_vanaf_begin];
} 

function create_output_json(best_result, best_week_index, best_start_vanaf_begin, filename = "best_week_planning.json") {
    // Create a JSON file in the exact format of sample_output.json from the best week planning results.
    
    // Load input data to get student information
    const input_data = JSON.parse(fs.readFileSync('sample_input.json', 'utf8'));
    
    const students = input_data.leerlingen;
    
    // Create student lookup dictionary
    const student_lookup = {};
    for (const student of students) {
        student_lookup[student.id] = student.naam;
    }
    
    // Filter out pause lessons and format lessons according to sample_output.json format
    const formatted_lessons = [];
    for (const lesson of best_result.lessons) {
        if (lesson.studentId !== "PAUSE") { // Skip pause lessons
            const formatted_lesson = {
                date: lesson.date,
                startTime: lesson.startTime,
                endTime: lesson.endTime,
                studentId: lesson.studentId,
                studentName: lesson.studentName,
                notes: ""
            };
            formatted_lessons.push(formatted_lesson);
        }
    }
    
    // Sort lessons in chronological order from Monday morning to Sunday evening
    // Define the standard week order for sorting
    const standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    
    // Create a mapping from dates to day names for sorting
    const date_to_day = {};
    for (let i = 0; i < standard_week_order.length; i++) {
        if (i < input_data.instructeur.datums.length) {
            date_to_day[input_data.instructeur.datums[i]] = standard_week_order[i];
        }
    }
    
    // Sort lessons by date (day of week) and then by start time
    formatted_lessons.sort((a, b) => {
        const day_a = standard_week_order.indexOf(date_to_day[a.date] || 'zondag');
        const day_b = standard_week_order.indexOf(date_to_day[b.date] || 'zondag');
        if (day_a !== day_b) return day_a - day_b;
        return a.startTime.localeCompare(b.startTime);
    });
    
    // Calculate students without lessons
    const students_without_lessons = {};
    for (const student of students) {
        const student_lessons_count = formatted_lessons.filter(l => l.studentId === student.id).length;
        const missing_lessons = student.lessenPerWeek - student_lessons_count;
        if (missing_lessons > 0) {
            students_without_lessons[student.naam] = missing_lessons;
        }
    }
    
    // Calculate total time between lessons (excluding pause lessons)
    let total_time_between_lessons = 0;
    const lessons_by_day = {};
    
    for (const lesson of best_result.lessons) {
        if (lesson.studentId === "PAUSE") {
            continue;
        }
        const day = lesson.date;
        if (!(day in lessons_by_day)) {
            lessons_by_day[day] = [];
        }
        lessons_by_day[day].push(lesson);
    }
    
    for (const [day, day_lessons] of Object.entries(lessons_by_day)) {
        day_lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < day_lessons.length - 1; i++) {
            const current_lesson_end = parse_time(day_lessons[i].endTime);
            const next_lesson_start = parse_time(day_lessons[i + 1].startTime);
            const gap_minutes = next_lesson_start - current_lesson_end;
            total_time_between_lessons += gap_minutes;
        }
    }
    
    // Create the output structure matching sample_output.json format
    const output_data = {
        lessons: formatted_lessons,
        leerlingen_zonder_les: students_without_lessons,
        schedule_details: {
            lessen: formatted_lessons.length,
            totale_minuten_tussen_lessen: total_time_between_lessons
        }
    };
    
    // Output alleen JSON naar stdout
    process.stdout.write(JSON.stringify(output_data, null, 2));
}

// Main execution
// Verwijder alle console.log statements behalve de JSON output
// console.log("=== VERGELIJKING VAN 20 VERSCHILLENDE DAG VOLGORDES ===");
// console.log();

day_variations = [
    ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
    ['dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag'],
    ['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag'],
    ['donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag'],
    ['vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag'],
    ['zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'],
    ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
];

// Get input file from command line argument or use default
const inputFile = process.argv[2] || 'sample_input.json';

const days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const list_available_days_integers = [];
// Read on which days the instructor is available
for (let i = 0; i < 7; i++) {
    // read json file 
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    if (days[i] in data.instructeur.beschikbareUren) {
        if (data.instructeur.beschikbareUren[days[i]].length > 0) {
            list_available_days_integers.push(i);
        }
    }
}

// Verwijder alle console.log statements behalve de JSON output
const total_combinations = factorial(list_available_days_integers.length);
// Verwijder alle console.log statements behalve de JSON output
const available_days = list_available_days_integers.length;
// Add every single combination of days
for (let combination_index = 0; combination_index < Math.min(100, total_combinations); combination_index++) {
    const remaining_days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    const new_combination = [];
    for (let day_index = 0; day_index < 7; day_index++) {
        const selected_day = remaining_days[Math.floor(Math.random() * remaining_days.length)];
        new_combination.push(selected_day);
        remaining_days.splice(remaining_days.indexOf(selected_day), 1);
    }
    day_variations.push(new_combination);
    // Verwijder alle console.log statements behalve de JSON output
}

const results = [];
let highest_score = 0;
let best_week_index = 0;
let best_rest_time = Infinity; // Initialize with infinity for tiebreaker
let best_start_vanaf_begin = false;

for (let i = 0; i < day_variations.length; i++) {
    // Verwijder alle console.log statements behalve de JSON output
    // Get the first 5 days from each variation (work week)
    const day_order = day_variations[i];
    // Verwijder alle console.log statements behalve de JSON output
    // console.log();
    const random_start_vanaf_begin = [true, false][Math.floor(Math.random() * 2)];

    const [result, score, total_time_between_lessons, start_vanaf_begin] = generate_week_planning(i, random_start_vanaf_begin, false);
    results.push([i, score, total_time_between_lessons, result]);
    
    // Update best option: prioritize number of lessons, then use rest time as tiebreaker
    if (score > highest_score || (score === highest_score && total_time_between_lessons < best_rest_time)) {
        highest_score = score;
        best_week_index = i;
        best_rest_time = total_time_between_lessons;
        best_start_vanaf_begin = start_vanaf_begin;
    }
    
    // Verwijder alle console.log statements behalve de JSON output
}

// Verwijder alle console.log statements behalve de JSON output
// console.log("=== SAMENVATTING VAN ALLE OPTIES ===");
// console.log();

for (const [i, score, total_time_between_lessons, result] of results) {
    const day_order = day_variations[i];
    // Verwijder alle console.log statements behalve de JSON output
}

// Verwijder alle console.log statements behalve de JSON output
// console.log();
// Verwijder alle console.log statements behalve de JSON output
// console.log(`BESTE OPTIE: Optie ${best_week_index+1} met ${highest_score} lessen en ${best_rest_time} minuten rust`);
// console.log();
// Verwijder alle console.log statements behalve de JSON output
// console.log("=== DETAILS VAN BESTE OPTIE ===");
// console.log();

// Show details of the best option
// Verwijder alle console.log statements behalve de JSON output
// console.log(`Optie ${best_week_index+1} details:`);
// console.log(`Dag volgorde: ${day_variations[best_week_index]}`);
// console.log(`Start vanaf begin: ${best_start_vanaf_begin}`);
// console.log();

// Re-run the best option with details
const [best_result, best_score, final_best_rest_time, final_best_start_vanaf_begin] = generate_week_planning(best_week_index, best_start_vanaf_begin, true);

// Create JSON output file
// Verwijder alle console.log statements behalve de JSON output
// console.log("\n=== JSON BESTAND AANMAKEN ===");
create_output_json(best_result, best_week_index, best_start_vanaf_begin);

// Helper function for factorial
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
} 