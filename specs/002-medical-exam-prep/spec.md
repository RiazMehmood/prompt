# Feature Spec: Medical Exam Prep Domain (002-medical-exam-prep)

**Version:** 1.0.0
**Date:** 2026-03-24
**Status:** Draft
**Branch:** 002-medical-exam-prep (planned)
**Domain ID:** `00000000-0000-0000-0000-000000000003`

---

## 1. Overview

The Medical domain is a **FCPS exam preparation platform** — NOT a clinical/hospital tool. Think UWorld + AMBOSS but built specifically for Pakistani medical postgraduates preparing for CPSP (College of Physicians and Surgeons Pakistan) exams, with Urdu language support and AI-powered tutoring.

**Pilot scope:** FCPS Part I + Part II
**Full scale (future):** USMLE Step 1/2/3, MRCP Part 1/2, MRCGP

---

## 2. Target Users

| User | Description |
|------|-------------|
| **MBBS graduate** | Preparing for FCPS Part I (basic sciences) |
| **Resident doctor** | Preparing for FCPS Part II (specialty clinical) |
| **Institute admin** | Medical college / coaching academy managing student cohorts |
| **Content admin** | Staff adding/reviewing AI-generated questions |

---

## 3. Exam Coverage (Pilot: FCPS)

### FCPS Part I — Basic Sciences
- Anatomy (General, Gross, Neuroanatomy, Embryology, Histology)
- Physiology (General, Systems)
- Biochemistry
- Pathology (General, Systemic)
- Pharmacology
- Community Medicine / Public Health
- Forensic Medicine

### FCPS Part II — Clinical (specialty-specific, 73 specialties)
- Internal Medicine, Surgery, Paediatrics, Obs/Gynae, Psychiatry, Orthopaedics, ENT, Ophthalmology, Radiology, Dermatology (and more)

### Exam Format
- MCQs: Single best answer (SBA), Extended matching items (EMI)
- Clinical vignettes (scenario-based)
- Image-based questions (X-ray, histology slides, clinical photos)

---

## 4. Core Features

### 4.1 Question Bank (AI-Generated, RAG-Augmented)

**Phase 1 — AI Generation:**
- Gemini generates high-quality FCPS-style MCQs from medical textbooks/guidelines fed into RAG
- Each question: stem + 5 options (A–E) + correct answer + detailed explanation
- Tagged by: subject, topic, subtopic, difficulty (1–5), exam part (I/II), specialty, question type

**Phase 2 — Purchased/Licensed Content:**
- Upload licensed question banks → RAG ingestion → searchable, referenceable
- Source attribution maintained per question

**Question schema:**
```
question_id, stem, options[A-E], correct_option, explanation,
subject, topic, subtopic, difficulty, exam_part, specialty,
image_url, source, language (en/ur), is_ai_generated, reviewed_by
```

### 4.2 Practice Modes

| Mode | Description |
|------|-------------|
| **Tutor Mode** | Immediate feedback after each question; AI explains wrong answers |
| **Timed/Exam Mode** | Simulates real FCPS exam timing; no feedback until end |
| **Subject Mode** | Filter by subject/topic/specialty |
| **Weak Topic Mode** | AI selects questions from your weakest areas |
| **Rapid Fire** | Quick 10-question sprint for revision |
| **Past Paper Mode** | Simulates CPSP past paper format |

### 4.3 AI Tutor (Core Differentiator)

The AI tutor activates in chat after practice sessions:

- **"Why is this wrong?"** — Explains incorrect options with clinical reasoning
- **"Teach me this topic"** — AI generates a mini-lecture (500–800 words) with key points
- **"Give me a similar question"** — Generates a new AI question on same concept
- **Case Simulator** — AI presents clinical vignette, student asks questions, AI guides to diagnosis
- **Differential Diagnosis Chat** — Student describes case, AI helps build DDx
- **Oral Exam Prep (Viva Simulation)** — AI acts as examiner, asks viva-style questions
- **Urdu Support** — All explanations available in Urdu; questions can be in Urdu

### 4.4 Performance Analytics

- **Dashboard:** Score trends, subject-wise performance, time-per-question
- **Weak Topic Heatmap:** Visual map of subjects → topics → subtopics by performance
- **Predicted Pass Probability:** ML model based on performance vs. CPSP pass rate data
- **Peer Comparison:** Anonymized percentile ranking among platform users
- **Study Streak & Time Logged:** Gamification for consistency
- **Specialty Readiness Score:** For Part II candidates

### 4.5 Flashcards (Spaced Repetition)

- Auto-generated from question explanations
- Anki-style SRS algorithm (SM-2)
- Urdu/English toggle per card
- Image flashcards for anatomy/histology

### 4.6 Image Bank

- X-rays, CT/MRI, histology slides, clinical photos
- Labelled diagrams (anatomy)
- Questions linked to images
- AI describes image findings for learning

### 4.7 Content Management (Admin)

- AI question generation: prompt → review → approve → publish
- Bulk import: PDF/DOCX question banks → AI parsing → structured questions
- Quality review queue: flag low-confidence AI questions for human review
- Curriculum mapping: link questions to CPSP syllabus topics

---

## 5. AI Architecture

### RAG Knowledge Base (per domain)
- Medical textbooks: Gray's Anatomy, Ganong's Physiology, Robbins Pathology, Katzung Pharmacology, etc.
- CPSP past papers (when available)
- Clinical guidelines (UpToDate-style summaries)
- Embeddings: `intfloat/multilingual-e5-base` (same as Legal domain — Urdu support)
- ChromaDB namespace: `medical`

### AI Question Generation Pipeline
```
Admin prompt / textbook chunk
    → Gemini: generate question + options + explanation
    → Quality check: distractor plausibility, answer correctness
    → Human review queue (optional)
    → Publish to question bank
```

### AI Tutor Pipeline
```
Student selects question or asks chat
    → RAG retrieval from medical KB
    → Gemini: answer grounded in retrieved content
    → Response with source references
    → Urdu translation if requested
```

---

## 6. Database Schema (new tables)

```sql
-- Questions
questions (
  id UUID PK,
  domain_id UUID FK → domains,
  stem TEXT,
  options JSONB,           -- {A: text, B: text, ...}
  correct_option CHAR(1),
  explanation TEXT,
  explanation_ur TEXT,     -- Urdu explanation
  subject VARCHAR,
  topic VARCHAR,
  subtopic VARCHAR,
  difficulty SMALLINT,     -- 1–5
  exam_part VARCHAR,       -- 'part1' | 'part2'
  specialty VARCHAR,
  question_type VARCHAR,   -- 'sba' | 'emi' | 'vignette'
  image_url TEXT,
  source VARCHAR,
  language VARCHAR DEFAULT 'en',
  is_ai_generated BOOLEAN,
  is_reviewed BOOLEAN,
  reviewed_by UUID FK → profiles,
  created_at TIMESTAMPTZ
)

-- Practice Sessions
practice_sessions (
  id UUID PK,
  user_id UUID FK → profiles,
  mode VARCHAR,
  subject VARCHAR,
  specialty VARCHAR,
  total_questions INT,
  answered INT,
  correct INT,
  time_taken_seconds INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- Session Answers
session_answers (
  id UUID PK,
  session_id UUID FK → practice_sessions,
  question_id UUID FK → questions,
  selected_option CHAR(1),
  is_correct BOOLEAN,
  time_taken_seconds INT,
  flagged BOOLEAN DEFAULT false
)

-- User Performance (aggregated)
user_performance (
  id UUID PK,
  user_id UUID FK → profiles,
  subject VARCHAR,
  topic VARCHAR,
  total_attempted INT,
  total_correct INT,
  last_attempted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Flashcards
flashcards (
  id UUID PK,
  user_id UUID FK → profiles,
  question_id UUID FK → questions,
  front TEXT,
  back TEXT,
  next_review_at TIMESTAMPTZ,
  interval_days INT,
  ease_factor FLOAT
)
```

---

## 7. API Endpoints (planned)

```
POST   /api/medical/questions/generate      # AI generate question
GET    /api/medical/questions               # List/filter questions
GET    /api/medical/questions/{id}          # Single question
POST   /api/medical/sessions               # Start practice session
POST   /api/medical/sessions/{id}/answer   # Submit answer
GET    /api/medical/sessions/{id}          # Session results
GET    /api/medical/analytics/me           # My performance dashboard
GET    /api/medical/analytics/heatmap      # Weak topic heatmap
POST   /api/medical/chat                   # AI tutor chat
GET    /api/medical/flashcards             # My flashcards (SRS due)
POST   /api/medical/flashcards/{id}/review # Submit SRS review
```

---

## 8. Phased Rollout

### Phase 1 — Pilot (FCPS Foundation)
- [ ] AI question generation pipeline (Gemini + RAG)
- [ ] Question bank with subject/topic tagging
- [ ] Tutor mode + timed mode
- [ ] Basic AI tutor chat (why wrong, teach me)
- [ ] Performance dashboard (subject-wise scores)
- [ ] Urdu explanation toggle
- [ ] Institute admin: student cohort management

### Phase 2 — Intelligence Layer
- [ ] Weak topic detection + personalized study plan
- [ ] Predicted pass probability
- [ ] Spaced repetition flashcards
- [ ] Case simulator + viva simulation
- [ ] Image bank + image-based questions
- [ ] Peer comparison analytics

### Phase 3 — Scale
- [ ] USMLE Step 1/2/3 content
- [ ] MRCP Part 1/2 content
- [ ] Purchased question bank RAG ingestion
- [ ] Mobile app (React Native)
- [ ] Offline mode for question practice

---

## 9. Competitive Positioning

| Feature | UWorld | AMBOSS | Interface (FCPS) | **Our Platform** |
|---------|--------|--------|-----------------|-----------------|
| FCPS-specific | ❌ | ❌ | ✅ | ✅ |
| AI tutor | ❌ | ✅ | ❌ | ✅ |
| Urdu support | ❌ | ❌ | ❌ | ✅ |
| AI question gen | ❌ | ❌ | ❌ | ✅ |
| Viva simulation | ❌ | Partial | ❌ | ✅ |
| Case simulator | ❌ | ✅ | ❌ | ✅ |
| Pakistan context | ❌ | ❌ | Partial | ✅ |
| Price | High | High | Low | Medium |

---

## 10. Non-Goals (Pilot)
- Clinical decision support (not a hospital tool)
- Patient management / EMR
- CME/CPD tracking
- Direct CPSP integration
- Video lectures (Phase 3+)

---

## 11. Acceptance Criteria
- [ ] AI generates valid FCPS-style MCQ with 5 options + explanation in < 10s
- [ ] RAG retrieval grounds AI tutor responses to uploaded textbooks
- [ ] Urdu explanation toggle works for all questions
- [ ] Practice session records answers + scores correctly
- [ ] Performance heatmap shows subject → topic breakdown
- [ ] Institute admin can view all student scores in their cohort
- [ ] RLS: users see only their own sessions/answers/flashcards
