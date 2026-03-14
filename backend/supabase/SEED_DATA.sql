-- Seed Data for Checkpoint 1 MVP
-- Run this AFTER running COMBINED_MIGRATION.sql
-- This creates initial data: lawyer role, admin user, sample documents

-- ============================================================
-- 1. Create Lawyer Role
-- ============================================================

INSERT INTO roles (role_name, display_name, category, ai_persona_prompt, sidebar_features)
VALUES (
    'lawyer',
    'Lawyer',
    'professional',
    'You are a legal assistant specializing in Pakistani law.
You have expertise in:
- Pakistan Penal Code (PPC)
- Code of Criminal Procedure (CrPC)
- Civil Procedure Code (CPC)
- Constitutional law
- Case law and precedents

Provide accurate legal information, cite relevant sections, and help with:
- Case analysis and strategy
- Document drafting (bail applications, petitions, etc.)
- Legal research and precedent finding
- Procedural guidance

Always cite specific sections and case law when applicable.',
    '["chat", "documents", "case_analysis", "document_generation", "legal_research"]'::jsonb
)
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================
-- 2. Create Root Admin User
-- ============================================================

-- First, get the lawyer role_id
DO $$
DECLARE
    lawyer_role_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get lawyer role ID
    SELECT role_id INTO lawyer_role_id FROM roles WHERE role_name = 'lawyer';

    -- Create admin user (password: admin123)
    INSERT INTO users (email, password_hash, auth_method, full_name, role_id, account_status)
    VALUES (
        'admin@example.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7qXqKqKqKq',
        'email',
        'Root Administrator',
        lawyer_role_id,
        'active'
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO admin_user_id;

    -- Create admin record
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO admins (user_id, admin_type, permissions, is_active)
        VALUES (
            admin_user_id,
            'root',
            '{"manage_roles": true, "approve_documents": true, "manage_users": true, "view_analytics": true, "manage_subscriptions": true}'::jsonb,
            true
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================
-- 3. Create Sample Legal Documents
-- ============================================================

DO $$
DECLARE
    lawyer_role_id UUID;
BEGIN
    -- Get lawyer role ID
    SELECT role_id INTO lawyer_role_id FROM roles WHERE role_name = 'lawyer';

    -- PPC Section 302 - Murder
    INSERT INTO documents (title, content, category, role_id, status, metadata)
    VALUES (
        'PPC Section 302 - Punishment for Murder',
        'Section 302. Punishment for murder.
Whoever commits qatl-e-amd shall, subject to the provisions of this Chapter be-
(a) punished with death as qisas;
(b) punished with death or imprisonment for life as ta''zir having regard to the facts and circumstances of the case, if the proof in either of the forms specified in section 304 is not available; or
(c) punished with imprisonment of either description for a term which may extend to twenty-five years where according to the injunctions of Islam the punishment of qisas is not applicable.',
        'legal',
        lawyer_role_id,
        'approved',
        '{"law": "PPC", "section": "302", "topic": "Murder"}'::jsonb
    );

    -- PPC Section 420 - Cheating
    INSERT INTO documents (title, content, category, role_id, status, metadata)
    VALUES (
        'PPC Section 420 - Cheating and Dishonestly Inducing Delivery of Property',
        'Section 420. Cheating and dishonestly inducing delivery of property.
Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
        'legal',
        lawyer_role_id,
        'approved',
        '{"law": "PPC", "section": "420", "topic": "Cheating"}'::jsonb
    );

    -- PPC Section 489-F - Counterfeiting
    INSERT INTO documents (title, content, category, role_id, status, metadata)
    VALUES (
        'PPC Section 489-F - Making or Possessing Instruments for Counterfeiting',
        'Section 489-F. Making or possessing instruments or materials for forging or counterfeiting currency-notes or bank-notes.
Whoever makes or performs any part of the process of making, or buys, or sells or disposes of, or has in his possession, any machinery, instrument or material for the purpose of being used, or knowing or having reason to believe that it is intended to be used, for forging or counterfeiting any currency-note or bank-note, shall be punished with imprisonment for life, or with imprisonment of either description for a term which may extend to ten years, and shall also be liable to fine.',
        'legal',
        lawyer_role_id,
        'approved',
        '{"law": "PPC", "section": "489-F", "topic": "Counterfeiting"}'::jsonb
    );

    -- CrPC Section 154 - FIR
    INSERT INTO documents (title, content, category, role_id, status, metadata)
    VALUES (
        'CrPC Section 154 - Information in Cognizable Cases',
        'Section 154. Information in cognizable cases.
(1) Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it, and the substance thereof shall be entered in a book to be kept by such officer in such form as the Provincial Government may prescribe in this behalf.',
        'legal',
        lawyer_role_id,
        'approved',
        '{"law": "CrPC", "section": "154", "topic": "FIR"}'::jsonb
    );

    -- CrPC Section 497 - Bail
    INSERT INTO documents (title, content, category, role_id, status, metadata)
    VALUES (
        'CrPC Section 497 - When Bail May Be Taken in Case of Non-Bailable Offence',
        'Section 497. When bail may be taken in case of non-bailable offence.
(1) When any person accused of, or suspected of, the commission of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police-station or appears or is brought before a Court and is prepared at any time while in the custody of such officer or at any stage of the proceeding before such Court to give bail, such person may be admitted to bail:

Provided that an officer or Court admitting a person to bail under this section may impose any condition which he or it considers necessary.',
        'legal',
        lawyer_role_id,
        'approved',
        '{"law": "CrPC", "section": "497", "topic": "Bail"}'::jsonb
    );
END $$;

-- ============================================================
-- Seed Complete!
-- ============================================================
-- Created:
-- - 1 lawyer role
-- - 1 root admin user (admin@example.com / admin123)
-- - 5 sample legal documents (approved)
--
-- Next: Test the application!
