-- Migration 009: Education and Medical Domains + Templates
-- Adds two new professional domains with starter templates

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
    'Healthcare providers, clinics, and hospitals — patient documents, referral letters, discharge summaries, and medical certificates.',
    'medical_ns',
    'active',
    '{"supported_languages": ["english", "urdu"], "primary_document_types": ["protocol", "standard", "sample"]}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

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


-- ============================================================
-- MEDICAL TEMPLATES
-- ============================================================

-- 1. Patient Discharge Summary
INSERT INTO templates (name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
SELECT
  'Patient Discharge Summary',
  d.id,
  'Official discharge summary prepared by a physician at the time of patient discharge from hospital.',
  $CONTENT$
PATIENT DISCHARGE SUMMARY

─────────────────────────────────────────────
PATIENT INFORMATION
─────────────────────────────────────────────
Patient Name     : {{patient_name}}
Age / Gender     : {{patient_age}} / {{patient_gender}}
MRN / Ward No.   : {{mrn}} / {{ward}}
Date of Admission: {{admission_date}}
Date of Discharge: {{discharge_date}}
Attending Doctor : {{doctor_name}}, {{doctor_designation}}
Department       : {{department}}
─────────────────────────────────────────────

CHIEF COMPLAINT
{{chief_complaint}}

HISTORY OF PRESENT ILLNESS
{{history_of_illness}}

PAST MEDICAL HISTORY
{{past_medical_history}}

─────────────────────────────────────────────
EXAMINATION FINDINGS
─────────────────────────────────────────────
Vitals on Admission:
  BP: {{bp}} | Pulse: {{pulse}} | Temp: {{temperature}} | O2 Sat: {{oxygen_saturation}}

Physical Examination:
{{examination_findings}}

─────────────────────────────────────────────
INVESTIGATIONS
─────────────────────────────────────────────
{{investigations}}

─────────────────────────────────────────────
DIAGNOSIS
─────────────────────────────────────────────
Primary Diagnosis    : {{primary_diagnosis}}
Secondary Diagnosis  : {{secondary_diagnosis}}

─────────────────────────────────────────────
TREATMENT GIVEN
─────────────────────────────────────────────
{{treatment_given}}

Procedures Performed : {{procedures}}

─────────────────────────────────────────────
CONDITION AT DISCHARGE
─────────────────────────────────────────────
{{discharge_condition}}

─────────────────────────────────────────────
DISCHARGE MEDICATIONS
─────────────────────────────────────────────
{{discharge_medications}}

─────────────────────────────────────────────
FOLLOW-UP INSTRUCTIONS
─────────────────────────────────────────────
Follow-up Date     : {{followup_date}}
Follow-up Doctor   : {{followup_doctor}}
Special Instructions: {{special_instructions}}

Prepared by: {{doctor_name}}
Date       : {{discharge_date}}
Signature  : ___________________________
$CONTENT$,
  '[
    {"name": "patient_name",           "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Full Name"},
    {"name": "patient_age",            "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Age"},
    {"name": "patient_gender",         "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Gender"},
    {"name": "mrn",                    "type": "text", "required": false, "data_source": "user_input", "label": "Medical Record Number (MRN)"},
    {"name": "ward",                   "type": "text", "required": false, "data_source": "user_input", "label": "Ward / Room Number"},
    {"name": "admission_date",         "type": "text", "required": true,  "data_source": "user_input", "label": "Date of Admission"},
    {"name": "discharge_date",         "type": "text", "required": true,  "data_source": "user_input", "label": "Date of Discharge"},
    {"name": "doctor_name",            "type": "text", "required": true,  "data_source": "user_input", "label": "Attending Doctor Name"},
    {"name": "doctor_designation",     "type": "text", "required": false, "data_source": "user_input", "label": "Doctor Designation (e.g. MBBS, FCPS)"},
    {"name": "department",             "type": "text", "required": false, "data_source": "user_input", "label": "Department"},
    {"name": "chief_complaint",        "type": "text", "required": true,  "data_source": "user_input", "label": "Chief Complaint"},
    {"name": "history_of_illness",     "type": "text", "required": true,  "data_source": "user_input", "label": "History of Present Illness"},
    {"name": "past_medical_history",   "type": "text", "required": false, "data_source": "user_input", "label": "Past Medical History"},
    {"name": "bp",                     "type": "text", "required": false, "data_source": "user_input", "label": "Blood Pressure"},
    {"name": "pulse",                  "type": "text", "required": false, "data_source": "user_input", "label": "Pulse Rate"},
    {"name": "temperature",            "type": "text", "required": false, "data_source": "user_input", "label": "Temperature"},
    {"name": "oxygen_saturation",      "type": "text", "required": false, "data_source": "user_input", "label": "Oxygen Saturation"},
    {"name": "examination_findings",   "type": "text", "required": true,  "data_source": "user_input", "label": "Physical Examination Findings"},
    {"name": "investigations",         "type": "text", "required": true,  "data_source": "user_input", "label": "Investigations / Lab Results"},
    {"name": "primary_diagnosis",      "type": "text", "required": true,  "data_source": "user_input", "label": "Primary Diagnosis"},
    {"name": "secondary_diagnosis",    "type": "text", "required": false, "data_source": "user_input", "label": "Secondary / Differential Diagnosis"},
    {"name": "treatment_given",        "type": "text", "required": true,  "data_source": "user_input", "label": "Treatment Given (medications, therapies)"},
    {"name": "procedures",             "type": "text", "required": false, "data_source": "user_input", "label": "Procedures Performed"},
    {"name": "discharge_condition",    "type": "text", "required": true,  "data_source": "user_input", "label": "Condition at Discharge (stable/improved/etc.)"},
    {"name": "discharge_medications",  "type": "text", "required": true,  "data_source": "user_input", "label": "Discharge Medications (name, dose, frequency)"},
    {"name": "followup_date",          "type": "text", "required": false, "data_source": "user_input", "label": "Follow-up Date"},
    {"name": "followup_doctor",        "type": "text", "required": false, "data_source": "user_input", "label": "Follow-up Doctor / Clinic"},
    {"name": "special_instructions",   "type": "text", "required": false, "data_source": "user_input", "label": "Special Instructions / Dietary Advice"}
  ]'::jsonb,
  '{"page_size": "A4", "font": "Times New Roman", "font_size": 12}'::jsonb,
  '1.0.0',
  true
FROM domains d WHERE d.name = 'Medical'
ON CONFLICT (domain_id, name, version) DO NOTHING;


-- 2. Medical Certificate
INSERT INTO templates (name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
SELECT
  'Medical Certificate',
  d.id,
  'Fitness or sickness certificate issued by a registered medical practitioner.',
  $CONTENT$
MEDICAL CERTIFICATE

Date: {{certificate_date}}

I, Dr. {{doctor_name}}, {{doctor_qualifications}}, {{doctor_designation}} at {{clinic_hospital_name}}, hereby certify that:

Patient Name : {{patient_name}}
Age / Gender : {{patient_age}} / {{patient_gender}}
CNIC / ID    : {{patient_id}}

has been under my medical care and has been diagnosed with:

{{diagnosis}}

{{certificate_body}}

The patient {{fitness_statement}}.

{{additional_remarks}}

This certificate is issued on the request of the patient for {{purpose}}.

Dr. {{doctor_name}}
{{doctor_qualifications}}, {{doctor_designation}}
{{clinic_hospital_name}}
Registration No.: {{pmdc_registration}}
Contact: {{doctor_contact}}
Date: {{certificate_date}}
Stamp / Signature: ___________________________
$CONTENT$,
  '[
    {"name": "patient_name",        "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Full Name"},
    {"name": "patient_age",         "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Age"},
    {"name": "patient_gender",      "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Gender"},
    {"name": "patient_id",          "type": "text", "required": false, "data_source": "user_input", "label": "Patient CNIC / ID Number"},
    {"name": "doctor_name",         "type": "text", "required": true,  "data_source": "user_input", "label": "Doctor Full Name"},
    {"name": "doctor_qualifications","type": "text","required": true,  "data_source": "user_input", "label": "Doctor Qualifications (e.g. MBBS, FCPS)"},
    {"name": "doctor_designation",  "type": "text", "required": false, "data_source": "user_input", "label": "Doctor Designation (e.g. Senior Medical Officer)"},
    {"name": "clinic_hospital_name","type": "text", "required": true,  "data_source": "user_input", "label": "Clinic / Hospital Name"},
    {"name": "pmdc_registration",   "type": "text", "required": false, "data_source": "user_input", "label": "PMDC Registration Number"},
    {"name": "doctor_contact",      "type": "text", "required": false, "data_source": "user_input", "label": "Doctor Contact (phone / email)"},
    {"name": "diagnosis",           "type": "text", "required": true,  "data_source": "user_input", "label": "Diagnosis / Medical Condition"},
    {"name": "certificate_body",    "type": "text", "required": true,  "data_source": "user_input", "label": "Details of Illness / Treatment Period"},
    {"name": "fitness_statement",   "type": "text", "required": true,  "data_source": "user_input", "label": "Fitness Statement (e.g. is advised bed rest for 5 days / is fit to resume duties)"},
    {"name": "additional_remarks",  "type": "text", "required": false, "data_source": "user_input", "label": "Additional Remarks / Restrictions"},
    {"name": "purpose",             "type": "text", "required": true,  "data_source": "user_input", "label": "Purpose (e.g. submission to employer / school / court)"},
    {"name": "certificate_date",    "type": "text", "required": true,  "data_source": "user_input", "label": "Certificate Date"}
  ]'::jsonb,
  '{"page_size": "A4", "font": "Times New Roman", "font_size": 12}'::jsonb,
  '1.0.0',
  true
FROM domains d WHERE d.name = 'Medical'
ON CONFLICT (domain_id, name, version) DO NOTHING;


-- 3. Referral Letter
INSERT INTO templates (name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
SELECT
  'Referral Letter',
  d.id,
  'Physician referral letter directing a patient to a specialist or another healthcare facility.',
  $CONTENT$
REFERRAL LETTER

Date: {{referral_date}}

To,
Dr. {{specialist_name}}
{{specialist_designation}}
{{specialist_hospital}}

Dear Dr. {{specialist_name}},

Re: {{patient_name}}, {{patient_age}} years / {{patient_gender}}

I am referring the above-named patient to your care for specialist evaluation and management.

─────────────────────────────────────────────
PATIENT DETAILS
─────────────────────────────────────────────
Name           : {{patient_name}}
Age / Gender   : {{patient_age}} / {{patient_gender}}
Contact        : {{patient_contact}}
MRN            : {{mrn}}

─────────────────────────────────────────────
REASON FOR REFERRAL
─────────────────────────────────────────────
{{reason_for_referral}}

─────────────────────────────────────────────
CLINICAL SUMMARY
─────────────────────────────────────────────
Presenting Complaints:
{{presenting_complaints}}

Relevant History:
{{relevant_history}}

Current Medications:
{{current_medications}}

Recent Investigations:
{{investigations_summary}}

Diagnosis / Working Diagnosis:
{{diagnosis}}

─────────────────────────────────────────────
SPECIFIC REQUEST
─────────────────────────────────────────────
{{specific_request}}

I would be grateful for your expert opinion and management. Please do not hesitate to contact me if you require any further information.

Yours sincerely,

Dr. {{referring_doctor_name}}
{{referring_doctor_qualifications}}
{{referring_doctor_designation}}
{{referring_hospital}}
PMDC Reg. No.: {{pmdc_registration}}
Contact: {{referring_doctor_contact}}
Date: {{referral_date}}
$CONTENT$,
  '[
    {"name": "patient_name",                   "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Full Name"},
    {"name": "patient_age",                    "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Age"},
    {"name": "patient_gender",                 "type": "text", "required": true,  "data_source": "user_input", "label": "Patient Gender"},
    {"name": "patient_contact",                "type": "text", "required": false, "data_source": "user_input", "label": "Patient Contact Number"},
    {"name": "mrn",                            "type": "text", "required": false, "data_source": "user_input", "label": "Medical Record Number"},
    {"name": "specialist_name",                "type": "text", "required": true,  "data_source": "user_input", "label": "Specialist Doctor Name"},
    {"name": "specialist_designation",         "type": "text", "required": false, "data_source": "user_input", "label": "Specialist Designation / Department"},
    {"name": "specialist_hospital",            "type": "text", "required": true,  "data_source": "user_input", "label": "Specialist Hospital / Clinic"},
    {"name": "reason_for_referral",            "type": "text", "required": true,  "data_source": "user_input", "label": "Reason for Referral"},
    {"name": "presenting_complaints",          "type": "text", "required": true,  "data_source": "user_input", "label": "Presenting Complaints"},
    {"name": "relevant_history",               "type": "text", "required": true,  "data_source": "user_input", "label": "Relevant Medical History"},
    {"name": "current_medications",            "type": "text", "required": false, "data_source": "user_input", "label": "Current Medications"},
    {"name": "investigations_summary",         "type": "text", "required": false, "data_source": "user_input", "label": "Recent Investigations Summary"},
    {"name": "diagnosis",                      "type": "text", "required": true,  "data_source": "user_input", "label": "Diagnosis / Working Diagnosis"},
    {"name": "specific_request",               "type": "text", "required": true,  "data_source": "user_input", "label": "Specific Request to Specialist"},
    {"name": "referring_doctor_name",          "type": "text", "required": true,  "data_source": "user_input", "label": "Referring Doctor Name"},
    {"name": "referring_doctor_qualifications","type": "text", "required": false, "data_source": "user_input", "label": "Referring Doctor Qualifications"},
    {"name": "referring_doctor_designation",   "type": "text", "required": false, "data_source": "user_input", "label": "Referring Doctor Designation"},
    {"name": "referring_hospital",             "type": "text", "required": true,  "data_source": "user_input", "label": "Referring Hospital / Clinic"},
    {"name": "pmdc_registration",              "type": "text", "required": false, "data_source": "user_input", "label": "PMDC Registration Number"},
    {"name": "referring_doctor_contact",       "type": "text", "required": false, "data_source": "user_input", "label": "Referring Doctor Contact"},
    {"name": "referral_date",                  "type": "text", "required": true,  "data_source": "user_input", "label": "Referral Date"}
  ]'::jsonb,
  '{"page_size": "A4", "font": "Times New Roman", "font_size": 12}'::jsonb,
  '1.0.0',
  true
FROM domains d WHERE d.name = 'Medical'
ON CONFLICT (domain_id, name, version) DO NOTHING;
