-- Migration 009: Education and Medical Domains + Education Templates
-- Medical domain = FCPS exam preparation platform (NOT clinical/hospital)
-- Medical templates handled separately in a future migration (002-medical-exam-prep)

-- ============================================================
-- DOMAINS
-- ============================================================

INSERT INTO domains (name, description, knowledge_base_namespace, status, configuration)
VALUES
  (
    'Education',
    'Academic institutions, schools, colleges, and universities — student records, reports, lesson plans, and administrative documents.',
    'education_ns',
    'active',
    '{"supported_languages": ["english", "urdu"], "primary_document_types": ["textbook", "standard", "sample"]}'::jsonb
  ),
  (
    'Medical',
    'FCPS and postgraduate medical exam preparation platform — AI-powered question bank, practice sessions, AI tutor, and analytics for CPSP exams.',
    'medical_ns',
    'active',
    '{"supported_languages": ["english", "urdu"], "primary_document_types": ["question_bank", "study_material", "past_paper"], "exam_boards": ["CPSP", "USMLE", "MRCP"], "pilot": "FCPS"}'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  configuration = EXCLUDED.configuration;

-- ============================================================
-- EDUCATION TEMPLATES
-- ============================================================

-- 1. Student Progress Report
INSERT INTO templates (name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
SELECT
  'Student Progress Report',
  d.id,
  'End-of-term academic progress report for a student, summarising grades, behaviour, and teacher recommendations.',
  $CONTENT$
STUDENT PROGRESS REPORT
Academic Year: {{academic_year}}   Term: {{term}}
Institution: {{institution_name}}

─────────────────────────────────────────────
STUDENT INFORMATION
─────────────────────────────────────────────
Name          : {{student_name}}
Class / Grade : {{class_grade}}
Roll No.      : {{roll_number}}
Date of Birth : {{date_of_birth}}

─────────────────────────────────────────────
ACADEMIC PERFORMANCE
─────────────────────────────────────────────
{{subject_grades}}

Overall Grade / GPA : {{overall_grade}}

─────────────────────────────────────────────
ATTENDANCE
─────────────────────────────────────────────
Total School Days    : {{total_days}}
Days Present         : {{days_present}}
Days Absent          : {{days_absent}}
Attendance %         : {{attendance_percentage}}

─────────────────────────────────────────────
TEACHER'S REMARKS
─────────────────────────────────────────────
{{teacher_remarks}}

─────────────────────────────────────────────
AREAS FOR IMPROVEMENT
─────────────────────────────────────────────
{{improvement_areas}}

─────────────────────────────────────────────
RECOMMENDATION
─────────────────────────────────────────────
{{recommendation}}

Prepared by  : {{teacher_name}}
Designation  : {{teacher_designation}}
Date         : {{report_date}}
Signature    : ___________________________
$CONTENT$,
  '[
    {"name": "student_name",          "type": "text",  "required": true,  "data_source": "user_input", "label": "Student Full Name"},
    {"name": "class_grade",           "type": "text",  "required": true,  "data_source": "user_input", "label": "Class / Grade"},
    {"name": "roll_number",           "type": "text",  "required": true,  "data_source": "user_input", "label": "Roll Number"},
    {"name": "date_of_birth",         "type": "text",  "required": false, "data_source": "user_input", "label": "Date of Birth"},
    {"name": "academic_year",         "type": "text",  "required": true,  "data_source": "user_input", "label": "Academic Year (e.g. 2024-25)"},
    {"name": "term",                  "type": "text",  "required": true,  "data_source": "user_input", "label": "Term (e.g. Term 1, Mid-Year)"},
    {"name": "institution_name",      "type": "text",  "required": true,  "data_source": "user_input", "label": "Institution Name"},
    {"name": "subject_grades",        "type": "text",  "required": true,  "data_source": "user_input", "label": "Subject-wise Grades (list each subject and marks)"},
    {"name": "overall_grade",         "type": "text",  "required": true,  "data_source": "user_input", "label": "Overall Grade / GPA"},
    {"name": "total_days",            "type": "text",  "required": false, "data_source": "user_input", "label": "Total School Days"},
    {"name": "days_present",          "type": "text",  "required": false, "data_source": "user_input", "label": "Days Present"},
    {"name": "days_absent",           "type": "text",  "required": false, "data_source": "user_input", "label": "Days Absent"},
    {"name": "attendance_percentage", "type": "text",  "required": false, "data_source": "user_input", "label": "Attendance Percentage"},
    {"name": "teacher_remarks",       "type": "text",  "required": true,  "data_source": "user_input", "label": "Teacher''s Remarks"},
    {"name": "improvement_areas",     "type": "text",  "required": false, "data_source": "user_input", "label": "Areas for Improvement"},
    {"name": "recommendation",        "type": "text",  "required": true,  "data_source": "user_input", "label": "Promotion / Recommendation"},
    {"name": "teacher_name",          "type": "text",  "required": true,  "data_source": "user_input", "label": "Teacher Name"},
    {"name": "teacher_designation",   "type": "text",  "required": false, "data_source": "user_input", "label": "Teacher Designation"},
    {"name": "report_date",           "type": "text",  "required": true,  "data_source": "user_input", "label": "Report Date"}
  ]'::jsonb,
  '{"page_size": "A4", "font": "Times New Roman", "font_size": 12}'::jsonb,
  '1.0.0',
  true
FROM domains d WHERE d.name = 'Education'
ON CONFLICT (domain_id, name, version) DO NOTHING;


-- 2. Academic Recommendation Letter
INSERT INTO templates (name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
SELECT
  'Academic Recommendation Letter',
  d.id,
  'Formal letter from a teacher or principal recommending a student for admission, scholarship, or employment.',
  $CONTENT$
{{institution_letterhead}}
Date: {{letter_date}}

To Whom It May Concern,

Subject: Letter of Recommendation for {{student_name}}

I, {{recommender_name}}, {{recommender_designation}} at {{institution_name}}, am pleased to recommend {{student_name}} for {{purpose}}.

{{student_name}} has been a student at this institution from {{enrollment_year}} to {{completion_year}}, pursuing {{program_name}}.

ACADEMIC STANDING
{{student_name}} has consistently demonstrated exceptional academic ability. {{academic_performance_summary}}

CHARACTER AND CONDUCT
Throughout their time here, {{student_name}} has shown {{character_description}}. They have actively participated in {{extra_curricular}} and have been recognised for {{achievements}}.

RECOMMENDATION
Based on my {{relationship_duration}} association with {{student_name}}, I am confident that they possess the qualities necessary to excel in {{purpose}}. I recommend them without reservation.

Please feel free to contact me at {{recommender_contact}} should you require any further information.

Sincerely,

{{recommender_name}}
{{recommender_designation}}
{{institution_name}}
{{letter_date}}
$CONTENT$,
  '[
    {"name": "student_name",                 "type": "text", "required": true,  "data_source": "user_input", "label": "Student Full Name"},
    {"name": "recommender_name",             "type": "text", "required": true,  "data_source": "user_input", "label": "Recommender Name"},
    {"name": "recommender_designation",      "type": "text", "required": true,  "data_source": "user_input", "label": "Recommender Designation"},
    {"name": "institution_name",             "type": "text", "required": true,  "data_source": "user_input", "label": "Institution Name"},
    {"name": "institution_letterhead",       "type": "text", "required": false, "data_source": "user_input", "label": "Institution Letterhead / Address Block"},
    {"name": "purpose",                      "type": "text", "required": true,  "data_source": "user_input", "label": "Purpose (e.g. university admission, scholarship)"},
    {"name": "program_name",                 "type": "text", "required": true,  "data_source": "user_input", "label": "Program / Class Name"},
    {"name": "enrollment_year",              "type": "text", "required": false, "data_source": "user_input", "label": "Year of Enrollment"},
    {"name": "completion_year",              "type": "text", "required": false, "data_source": "user_input", "label": "Year of Completion / Current Year"},
    {"name": "academic_performance_summary", "type": "text", "required": true,  "data_source": "user_input", "label": "Academic Performance Summary"},
    {"name": "character_description",        "type": "text", "required": true,  "data_source": "user_input", "label": "Character and Conduct Description"},
    {"name": "extra_curricular",             "type": "text", "required": false, "data_source": "user_input", "label": "Extra-Curricular Activities"},
    {"name": "achievements",                 "type": "text", "required": false, "data_source": "user_input", "label": "Notable Achievements / Awards"},
    {"name": "relationship_duration",        "type": "text", "required": false, "data_source": "user_input", "label": "Duration of Association (e.g. 3-year)"},
    {"name": "recommender_contact",          "type": "text", "required": false, "data_source": "user_input", "label": "Recommender Contact (email / phone)"},
    {"name": "letter_date",                  "type": "text", "required": true,  "data_source": "user_input", "label": "Letter Date"}
  ]'::jsonb,
  '{"page_size": "A4", "font": "Times New Roman", "font_size": 12}'::jsonb,
  '1.0.0',
  true
FROM domains d WHERE d.name = 'Education'
ON CONFLICT (domain_id, name, version) DO NOTHING;


-- 3. Lesson Plan
INSERT INTO templates (name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
SELECT
  'Lesson Plan',
  d.id,
  'Structured daily or weekly lesson plan for a teacher, outlining objectives, activities, and assessment.',
  $CONTENT$
LESSON PLAN
─────────────────────────────────────────────
Teacher       : {{teacher_name}}
Subject       : {{subject}}
Class / Grade : {{class_grade}}
Date          : {{lesson_date}}
Duration      : {{duration}}
─────────────────────────────────────────────

TOPIC
{{lesson_topic}}

LEARNING OBJECTIVES
By the end of this lesson, students will be able to:
{{learning_objectives}}

MATERIALS / RESOURCES
{{materials}}

─────────────────────────────────────────────
LESSON FLOW
─────────────────────────────────────────────

1. INTRODUCTION / WARM-UP  ({{intro_duration}})
{{introduction}}

2. MAIN ACTIVITY  ({{main_duration}})
{{main_activity}}

3. GUIDED PRACTICE  ({{practice_duration}})
{{guided_practice}}

4. CLOSURE / SUMMARY
{{closure}}

─────────────────────────────────────────────
ASSESSMENT
─────────────────────────────────────────────
{{assessment_method}}

HOMEWORK / ASSIGNMENT
{{homework}}

NOTES / REFLECTIONS
{{teacher_notes}}
$CONTENT$,
  '[
    {"name": "teacher_name",       "type": "text", "required": true,  "data_source": "user_input", "label": "Teacher Name"},
    {"name": "subject",            "type": "text", "required": true,  "data_source": "user_input", "label": "Subject"},
    {"name": "class_grade",        "type": "text", "required": true,  "data_source": "user_input", "label": "Class / Grade"},
    {"name": "lesson_date",        "type": "text", "required": true,  "data_source": "user_input", "label": "Lesson Date"},
    {"name": "duration",           "type": "text", "required": true,  "data_source": "user_input", "label": "Total Duration (e.g. 45 minutes)"},
    {"name": "lesson_topic",       "type": "text", "required": true,  "data_source": "user_input", "label": "Lesson Topic"},
    {"name": "learning_objectives","type": "text", "required": true,  "data_source": "user_input", "label": "Learning Objectives (one per line)"},
    {"name": "materials",          "type": "text", "required": false, "data_source": "user_input", "label": "Materials / Resources"},
    {"name": "intro_duration",     "type": "text", "required": false, "data_source": "user_input", "label": "Introduction Duration (e.g. 5 min)"},
    {"name": "introduction",       "type": "text", "required": true,  "data_source": "user_input", "label": "Introduction / Warm-up Activity"},
    {"name": "main_duration",      "type": "text", "required": false, "data_source": "user_input", "label": "Main Activity Duration"},
    {"name": "main_activity",      "type": "text", "required": true,  "data_source": "user_input", "label": "Main Teaching Activity"},
    {"name": "practice_duration",  "type": "text", "required": false, "data_source": "user_input", "label": "Guided Practice Duration"},
    {"name": "guided_practice",    "type": "text", "required": true,  "data_source": "user_input", "label": "Guided Practice / Group Work"},
    {"name": "closure",            "type": "text", "required": true,  "data_source": "user_input", "label": "Closure / Summary Activity"},
    {"name": "assessment_method",  "type": "text", "required": true,  "data_source": "user_input", "label": "Assessment Method (quiz, observation, etc.)"},
    {"name": "homework",           "type": "text", "required": false, "data_source": "user_input", "label": "Homework / Assignment"},
    {"name": "teacher_notes",      "type": "text", "required": false, "data_source": "user_input", "label": "Teacher Notes / Post-lesson Reflections"}
  ]'::jsonb,
  '{"page_size": "A4", "font": "Arial", "font_size": 11}'::jsonb,
  '1.0.0',
  true
FROM domains d WHERE d.name = 'Education'
ON CONFLICT (domain_id, name, version) DO NOTHING;

-- NOTE: Medical domain templates are intentionally excluded from this migration.
-- Medical = FCPS exam prep platform. Templates (question_bank, sessions, flashcards)
-- will be added in future migration: 011_medical_exam_prep.sql
