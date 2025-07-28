import { NextRequest, NextResponse } from 'next/server'

// Helper functions from generate_week_planning.js
function parse_time(time_str: string): number {
    const [hours, minutes] = time_str.split(':').map(Number);
    return hours * 60 + minutes;
}

function format_time(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const minutes_remainder = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes_remainder.toString().padStart(2, '0')}`;
}

function get_next_week_dates(random_week_index: number, instructor: any): any {
    const week_dates: any = {};
    const datums = instructor.datums || [];
    const standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    
    for (let i = 0; i < standard_week_order.length; i++) {
        const day = standard_week_order[i];
        if (i < datums.length) {
            week_dates[day] = datums[i];
        } else {
            const today = new Date();
            const days_ahead = 7 - today.getDay();
            const next_monday = new Date(today);
            next_monday.setDate(today.getDate() + (days_ahead <= 0 ? days_ahead + 7 : days_ahead));
            const date = new Date(next_monday);
            date.setDate(next_monday.getDate() + i);
            week_dates[day] = date.toISOString().split('T')[0];
        }
    }
    
    return week_dates;
}

function check_consecutive_lessons_time(day_lessons: any[], new_lesson_start: number, new_lesson_end: number, instructor: any): boolean {
    if (day_lessons.length === 0) {
        return false;
    }
    
    const sorted_lessons = day_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    const consecutive_lessons: any[] = [];
    
    for (const lesson of sorted_lessons) {
        const lesson_start = parse_time(lesson.startTime);
        const lesson_end = parse_time(lesson.endTime);
        
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
    
    const all_lessons = [...consecutive_lessons, {startTime: format_time(new_lesson_start), endTime: format_time(new_lesson_end)}];
    all_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    
    const total_consecutive_time = parse_time(all_lessons[all_lessons.length - 1].endTime) - parse_time(all_lessons[0].startTime);
    
    return total_consecutive_time >= 180;
}

function add_long_break_if_needed(day_lessons: any[], new_lesson_start: number, new_lesson_end: number, instructor: any, students: any[], print_details: boolean): number {
    if (!check_consecutive_lessons_time(day_lessons, new_lesson_start, new_lesson_end, instructor)) {
        return new_lesson_start;
    }
    
    const sorted_lessons = day_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    
    let prev_lesson = null;
    for (const lesson of sorted_lessons) {
        const lesson_end = parse_time(lesson.endTime);
        if (lesson_end <= new_lesson_start) {
            prev_lesson = lesson;
        }
    }
    
    if (prev_lesson) {
        const break_start = parse_time(prev_lesson.endTime) + instructor.pauzeTussenLessen;
        const break_end = break_start + instructor.langePauzeDuur;
        const adjusted_start = break_end + instructor.pauzeTussenLessen;
        return adjusted_start;
    }
    
    return new_lesson_start;
}

function can_schedule_block_hour(student_id: string, day: string, used_time_slots: any, instructor: any): boolean {
    if (!instructor.blokuren) {
        return false;
    }
    
    const day_lessons = used_time_slots[day].filter((lesson: any) => lesson.studentId === student_id);
    
    if (day_lessons.length > 0) {
        return false;
    }
    
    return true;
}

function can_schedule_normal_hour(student_id: string, day: string, used_time_slots: any, instructor: any): boolean {
    const day_lessons = used_time_slots[day].filter((lesson: any) => lesson.studentId === student_id);
    
    if (day_lessons.length === 0) {
        return true;
    }
    
    if (!instructor.blokuren) {
        return false;
    }
    
    return false;
}

function generate_week_planning(sampleInput: any, random_week_index: number, start_vanaf_begin: boolean, print_details: boolean = true): any {
    const instructor = sampleInput.instructeur;
    const students = sampleInput.leerlingen;
    
    const week_dates = get_next_week_dates(random_week_index, instructor);
    
    const lessons: any[] = [];
    const warnings: string[] = [];
    
    const student_lessons: any = {};
    for (const student of students) {
        student_lessons[student.id] = 0;
    }
    
    const student_lessons_per_day: any = {};
    for (const student of students) {
        student_lessons_per_day[student.id] = {};
        for (const day of Object.keys(week_dates)) {
            student_lessons_per_day[student.id][day] = 0;
        }
    }
    
    const used_time_slots: any = {};
    for (const day of Object.keys(week_dates)) {
        used_time_slots[day] = [];
    }
    
    const all_time_slots: any[] = [];
    
    for (const [day, date] of Object.entries(week_dates)) {
        if (!(day in instructor.beschikbareUren)) {
            continue;
        }
        
        if (!instructor.beschikbareUren[day] || instructor.beschikbareUren[day].length < 2) {
            continue;
        }
        
        const instructor_start = parse_time(instructor.beschikbareUren[day][0]);
        const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
        
        let current_time;
        if (start_vanaf_begin) {
            current_time = instructor_start;
        } else {
            current_time = instructor_end;
        }
        
        while ((start_vanaf_begin && current_time < instructor_end) || (!start_vanaf_begin && current_time > instructor_start)) {
            const available_students: any[] = [];
            
            for (const student of students) {
                if (student_lessons[student.id] < student.lessenPerWeek && 
                    day in student.beschikbaarheid) {
                    
                    const student_start = parse_time(student.beschikbaarheid[day][0]);
                    const student_end = parse_time(student.beschikbaarheid[day][1]);
                    
                    let can_schedule = false;
                    
                    if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
                        if (student_start <= current_time && current_time + student.lesDuur <= student_end) {
                            can_schedule = true;
                        }
                    } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
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
    
    // Day variations for different week orders
    const day_variations = [
        ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
        ['dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag'],
        ['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag'],
        ['donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag'],
        ['vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag'],
        ['zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'],
        ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    ];
    
    const current_day_order_slots: any = {};
    for (let i = 0; i < day_variations[random_week_index].length; i++) {
        current_day_order_slots[day_variations[random_week_index][i]] = i;
    }
    all_time_slots.sort((a: any, b: any) => {
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
        
        const available_students: any[] = [];
        for (const student of slot.available_students) {
            if (student_lessons[student.id] < student.lessenPerWeek) {
                let can_schedule = false;
                
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
            const selected_student = available_students.reduce((max: any, s: any) => {
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
            
            const adjusted_start = add_long_break_if_needed(used_time_slots[day], lesson_start, lesson_end_time, instructor, students, print_details);
            
            if (adjusted_start !== lesson_start) {
                lesson_start = adjusted_start;
                lesson_end_time = adjusted_start + selected_student.lesDuur;
            }
            
            let overlaps = false;
            for (const existing_lesson of used_time_slots[day]) {
                const existing_start = parse_time(existing_lesson.startTime);
                const existing_end = parse_time(existing_lesson.endTime);
                
                if (!(lesson_end_time <= existing_start || lesson_start >= existing_end)) {
                    overlaps = true;
                    break;
                }
            }
            
            if (selected_student.lesDuur < 120) {
                for (const existing_lesson of used_time_slots[day]) {
                    const existing_start = parse_time(existing_lesson.startTime);
                    const existing_end = parse_time(existing_lesson.endTime);
                    
                    if (lesson_end_time <= existing_start) {
                        const pause_time = existing_start - lesson_end_time;
                        if (pause_time < instructor.pauzeTussenLessen) {
                            overlaps = true;
                            break;
                        }
                    } else if (existing_end <= lesson_start) {
                        const pause_time = lesson_start - existing_end;
                        if (pause_time < instructor.pauzeTussenLessen) {
                            overlaps = true;
                            break;
                        }
                    }
                }
            }
            
            if (!overlaps) {
                let lessons_to_schedule = 1;
                if (can_schedule_block_hour(selected_student.id, day, used_time_slots, instructor) && 
                    selected_student.lessenPerWeek - student_lessons[selected_student.id] >= 2) {
                    const second_lesson_start = lesson_end_time;
                    const second_lesson_end = second_lesson_start + selected_student.lesDuur;
                    
                    const student_start = parse_time(selected_student.beschikbaarheid[day][0]);
                    const student_end = parse_time(selected_student.beschikbaarheid[day][1]);
                    
                    if (second_lesson_start >= student_start && 
                        second_lesson_end <= student_end &&
                        second_lesson_end <= parse_time(instructor.beschikbareUren[day][1])) {
                        
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
                
                for (let i = 0; i < lessons_to_schedule; i++) {
                    let current_start, current_end;
                    if (i === 0) {
                        current_start = lesson_start;
                        current_end = lesson_end_time;
                    } else {
                        current_start = lesson_end_time;
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
                
                if (lessons_to_schedule > 1 || selected_student.lesDuur >= 120) {
                    let block_end_time = lesson_end_time;
                    if (lessons_to_schedule > 1) {
                        block_end_time = lesson_end_time + (lessons_to_schedule - 1) * selected_student.lesDuur;
                    }
                    
                    const pause_start = block_end_time;
                    const pause_end = pause_start + instructor.langePauzeDuur;
                    
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
    
    const remaining_students = students.filter((s: any) => student_lessons[s.id] < s.lessenPerWeek);
    
    remaining_students.sort((a: any, b: any) => {
        const a_block = can_schedule_block_hour(a.id, 'maandag', used_time_slots, instructor);
        const b_block = can_schedule_block_hour(b.id, 'maandag', used_time_slots, instructor);
        if (a_block !== b_block) return a_block ? -1 : 1;
        return -(a.lessenPerWeek - student_lessons[a.id]) + (b.lessenPerWeek - student_lessons[b.id]);
    });
    
    if (remaining_students.length > 0) {
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
                
                let can_schedule = false;
                if (can_schedule_block_hour(student.id, day, used_time_slots, instructor)) {
                    can_schedule = true;
                } else if (can_schedule_normal_hour(student.id, day, used_time_slots, instructor)) {
                    can_schedule = true;
                }
                
                if (!can_schedule) {
                    continue;
                }
                
                const instructor_start = parse_time(instructor.beschikbareUren[day][0]);
                const instructor_end = parse_time(instructor.beschikbareUren[day][1]);
                const student_start = parse_time(student.beschikbaarheid[day][0]);
                const student_end = parse_time(student.beschikbaarheid[day][1]);
                
                const day_lessons = used_time_slots[day].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
                
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
                        
                        if (student.lesDuur >= 120) {
                            const pause_start = lesson_end_time;
                            const pause_end = pause_start + instructor.langePauzeDuur;
                            
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
                
                for (let i = 0; i < day_lessons.length; i++) {
                    const current_lesson_end = parse_time(day_lessons[i].endTime);
                    
                    let next_start;
                    if (i === day_lessons.length - 1) {
                        next_start = instructor_end;
                    } else {
                        next_start = parse_time(day_lessons[i + 1].startTime);
                    }
                    
                    let available_start, available_end;
                    if (student.lesDuur >= 120) {
                        available_start = current_lesson_end;
                        available_end = next_start;
                    } else {
                        available_start = current_lesson_end + instructor.pauzeTussenLessen;
                        available_end = next_start;
                    }
                    
                    if (available_end - available_start >= student.lesDuur) {
                        let lesson_start = Math.max(available_start, student_start);
                        let lesson_end_time = lesson_start + student.lesDuur;
                        
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
                            
                            if (student.lesDuur >= 120) {
                                const pause_start = lesson_end_time;
                                const pause_end = pause_start + instructor.langePauzeDuur;
                                
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
    
    const day_order = {maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6, zondag: 7};
    
    for (const lesson of lessons) {
        for (const [day, date] of Object.entries(week_dates)) {
            if (date === lesson.date) {
                lesson.day_name = day;
                break;
            }
        }
    }
    
    const current_day_order: any = {};
    for (let i = 0; i < day_variations[random_week_index].length; i++) {
        current_day_order[day_variations[random_week_index][i]] = i;
    }
    const sorted_lessons = lessons.sort((a: any, b: any) => {
        const day_a = current_day_order[a.day_name] || 999;
        const day_b = current_day_order[b.day_name] || 999;
        if (day_a !== day_b) return day_a - day_b;
        return a.startTime.localeCompare(b.startTime);
    });
    
    const total_required_lessons = students.reduce((sum: number, student: any) => sum + student.lessenPerWeek, 0);
    const total_planned_lessons = lessons.filter((lesson: any) => lesson.studentId !== "PAUSE").length;
    
    const summary = `Planning voor komende week: ${total_planned_lessons}/${total_required_lessons} lessen ingepland`;
    
    let total_time_between_lessons = 0;
    
    const lessons_by_day: any = {};
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
    
    for (const [day, day_lessons] of Object.entries(lessons_by_day)) {
        day_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
        
        for (let i = 0; i < day_lessons.length - 1; i++) {
            const current_lesson_end = parse_time(day_lessons[i].endTime);
            const next_lesson_start = parse_time(day_lessons[i + 1].startTime);
            const gap_minutes = next_lesson_start - current_lesson_end;
            total_time_between_lessons += gap_minutes;
        }
    }
    
    for (const student of students) {
        if (student_lessons[student.id] < student.lessenPerWeek) {
            const missing_lessons = student.lessenPerWeek - student_lessons[student.id];
            warnings.push(`Student ${student.naam} heeft nog ${missing_lessons} les(sen) nodig`);
        }
    }
    
    const response = {
        lessons: lessons,
        summary: summary,
        warnings: warnings
    };
    
    return [response, total_planned_lessons, total_time_between_lessons, start_vanaf_begin];
}

function create_output_json(best_result: any, best_week_index: number, best_start_vanaf_begin: boolean, students: any[]): any {
    const student_lookup: any = {};
    for (const student of students) {
        student_lookup[student.id] = student.naam;
    }
    
    const formatted_lessons: any[] = [];
    for (const lesson of best_result.lessons) {
        if (lesson.studentId !== "PAUSE") {
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
    
    const standard_week_order = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    
    const date_to_day: any = {};
    for (let i = 0; i < standard_week_order.length; i++) {
        // We'll use the dates from the best_result lessons
        const unique_dates = [...new Set(best_result.lessons.map((l: any) => l.date))];
        if (i < unique_dates.length) {
            date_to_day[unique_dates[i]] = standard_week_order[i];
        }
    }
    
    formatted_lessons.sort((a: any, b: any) => {
        const day_a = standard_week_order.indexOf(date_to_day[a.date] || 'zondag');
        const day_b = standard_week_order.indexOf(date_to_day[b.date] || 'zondag');
        if (day_a !== day_b) return day_a - day_b;
        return a.startTime.localeCompare(b.startTime);
    });
    
    const students_without_lessons: any = {};
    for (const student of students) {
        const student_lessons_count = formatted_lessons.filter((l: any) => l.studentId === student.id).length;
        const missing_lessons = student.lessenPerWeek - student_lessons_count;
        if (missing_lessons > 0) {
            students_without_lessons[student.naam] = missing_lessons;
        }
    }
    
    let total_time_between_lessons = 0;
    const lessons_by_day: any = {};
    
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
        day_lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < day_lessons.length - 1; i++) {
            const current_lesson_end = parse_time(day_lessons[i].endTime);
            const next_lesson_start = parse_time(day_lessons[i + 1].startTime);
            const gap_minutes = next_lesson_start - current_lesson_end;
            total_time_between_lessons += gap_minutes;
        }
    }
    
    const output_data = {
        lessons: formatted_lessons,
        leerlingen_zonder_les: students_without_lessons,
        schedule_details: {
            lessen: formatted_lessons.length,
            totale_minuten_tussen_lessen: total_time_between_lessons
        }
    };
    
    return output_data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { editableInputPath, data } = body

    if (!editableInputPath && !data) {
      return NextResponse.json(
        { error: 'Either editable input path or data is required' },
        { status: 400 }
      )
    }

    let sampleInput: any;
    
    if (data) {
      // Use the provided data directly
      sampleInput = data;
    } else {
      // This would be for reading from a file, but we'll skip this for now
      // since we're avoiding file system operations
      return NextResponse.json(
        { error: 'Direct data input is required in serverless environment' },
        { status: 400 }
      )
    }

    // Day variations for different week orders
    const day_variations = [
      ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
      ['dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag'],
      ['woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag'],
      ['donderdag', 'vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag'],
      ['vrijdag', 'zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag'],
      ['zaterdag', 'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'],
      ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    ];

    // Add random variations
    for (let combination_index = 0; combination_index < 20; combination_index++) {
      const remaining_days = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
      const new_combination = [];
      for (let day_index = 0; day_index < 7; day_index++) {
        const selected_day = remaining_days[Math.floor(Math.random() * remaining_days.length)];
        new_combination.push(selected_day);
        remaining_days.splice(remaining_days.indexOf(selected_day), 1);
      }
      day_variations.push(new_combination);
    }

    const results: any[] = [];
    let highest_score = 0;
    let best_week_index = 0;
    let best_rest_time = Infinity;
    let best_start_vanaf_begin = false;

    for (let i = 0; i < day_variations.length; i++) {
      const random_start_vanaf_begin = [true, false][Math.floor(Math.random() * 2)];

      const [result, score, total_time_between_lessons, start_vanaf_begin] = generate_week_planning(sampleInput, i, random_start_vanaf_begin, false);
      results.push([i, score, total_time_between_lessons, result]);
      
      if (score > highest_score || (score === highest_score && total_time_between_lessons < best_rest_time)) {
        highest_score = score;
        best_week_index = i;
        best_rest_time = total_time_between_lessons;
        best_start_vanaf_begin = start_vanaf_begin;
      }
    }

    // Re-run the best option with details
    const [best_result, best_score, final_best_rest_time, final_best_start_vanaf_begin] = generate_week_planning(sampleInput, best_week_index, best_start_vanaf_begin, true);

    // Create JSON output
    const output_data = create_output_json(best_result, best_week_index, best_start_vanaf_begin, sampleInput.leerlingen);

    console.log('Generated planning result:', output_data);

    return NextResponse.json({
      success: true,
      data: output_data,
      summary: best_result.summary,
      warnings: best_result.warnings
    })

  } catch (error) {
    console.error('Error in run generation API:', error)
    return NextResponse.json(
      { error: 'Failed to run generation' },
      { status: 500 }
    )
  }
} 