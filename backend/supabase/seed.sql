-- Seed Data: Default domains, templates, and root admin
-- Run AFTER all migrations

-- ============================================================
-- DEFAULT DOMAINS
-- ============================================================

INSERT INTO domains (id, name, description, icon_url, status, configuration, knowledge_base_namespace)
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'Legal',
        'Legal domain covering Pakistani law — bail applications, contracts, and legal templates',
        NULL,
        'active',
        '{"jurisdiction": "Pakistan", "languages": ["english", "urdu"], "document_types": ["act", "case_law", "sample"]}',
        'legal_pk'
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'Education',
        'Education domain for teachers — lesson planners, test generators, and MCQ practice',
        NULL,
        'active',
        '{"jurisdiction": "Pakistan", "languages": ["english", "urdu", "sindhi"], "document_types": ["textbook", "sample"]}',
        'education_pk'
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'Medical',
        'Medical domain for healthcare professionals — protocols, MCQ practice, and clinical guidelines',
        NULL,
        'active',
        '{"jurisdiction": "Pakistan", "languages": ["english", "urdu"], "document_types": ["protocol", "standard"]}',
        'medical_pk'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DEFAULT TEMPLATES — Legal Domain
-- ============================================================

INSERT INTO templates (id, name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active)
VALUES
    (
        '00000000-0000-0000-0001-000000000001',
        'Bail Application',
        '00000000-0000-0000-0000-000000000001',
        'Standard bail application for Pakistani courts',
        'IN THE COURT OF {{court_name}}

BAIL APPLICATION

Name of Accused: {{accused_name}}
FIR No: {{fir_number}}  Date: {{fir_date}}
Police Station: {{police_station}}
Section(s): {{sections}}

GROUNDS FOR BAIL:
{{bail_grounds}}

PREVIOUS BAIL HISTORY:
{{bail_history}}

PRAYER:
It is, therefore, most respectfully prayed that bail may be granted to the applicant.

Dated: {{application_date}}

{{lawyer_name}}
Advocate
{{bar_council}}',
        '[
            {"name": "court_name", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "accused_name", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "fir_number", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "fir_date", "type": "date", "required": true, "data_source": "user_input"},
            {"name": "police_station", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "sections", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "bail_grounds", "type": "text", "required": true, "data_source": "rag_retrieval"},
            {"name": "bail_history", "type": "text", "required": false, "data_source": "user_input"},
            {"name": "application_date", "type": "date", "required": true, "data_source": "user_input"},
            {"name": "lawyer_name", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "bar_council", "type": "text", "required": true, "data_source": "user_input"}
        ]',
        '{"paper_size": "A4", "margins": {"top": "1in", "bottom": "1in", "left": "1.25in", "right": "1in"}, "font": "Times New Roman", "font_size": 12, "language": "english"}',
        '1.0.0',
        true
    ),
    (
        '00000000-0000-0000-0001-000000000002',
        'Lesson Planner (Urdu)',
        '00000000-0000-0000-0000-000000000002',
        'Weekly lesson planner for Pakistani school teachers (Urdu)',
        'سبق کا منصوبہ

مضمون: {{subject}}
جماعت: {{grade}}
ہفتہ: {{week_number}}
تاریخ: {{date_range}}

سیکھنے کے مقاصد:
{{learning_objectives}}

سرگرمیاں:
{{activities}}

تشخیص:
{{assessment}}

گھر کا کام:
{{homework}}',
        '[
            {"name": "subject", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "grade", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "week_number", "type": "number", "required": true, "data_source": "user_input"},
            {"name": "date_range", "type": "text", "required": true, "data_source": "user_input"},
            {"name": "learning_objectives", "type": "text", "required": true, "data_source": "rag_retrieval"},
            {"name": "activities", "type": "text", "required": true, "data_source": "rag_retrieval"},
            {"name": "assessment", "type": "text", "required": false, "data_source": "user_input"},
            {"name": "homework", "type": "text", "required": false, "data_source": "user_input"}
        ]',
        '{"paper_size": "A4", "margins": {"top": "1in", "bottom": "1in", "left": "1.25in", "right": "1in"}, "font": "Jameel Noori Nastaleeq", "font_size": 14, "language": "urdu", "direction": "rtl"}',
        '1.0.0',
        true
    )
ON CONFLICT (id) DO NOTHING;
