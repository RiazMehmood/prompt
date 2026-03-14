# Feature Specification: Domain-Adaptive Multi-Tenant Agentic Platform

**Feature Branch**: `001-domain-adaptive-platform`
**Created**: 2026-03-14
**Updated**: 2026-03-14
**Status**: Draft
**Input**: User description: "Multi-Tenant Agentic SaaS (Domain-Adaptive Platform) - A unified SaaS that uses Domain-Specific Agentic RAG system for professionals (Lawyers, Teachers, Engineers, Officers, Doctors) in Pakistan to query role-relevant books, contribute content for approval (HITL), and generate industry-standard documents via specialized AI workflows. Includes subscription-based pricing (Basic/Pro/Premium tiers), payment gateway integration (JazzCash, EasyPaisa, Stripe), and premium add-ons like Medical Exam Preparation module for doctors. Built for high scalability using Docker/Kubernetes on DigitalOcean. Platform includes responsive web application (Next.js) and native mobile apps for iOS and Android (Expo/React Native)."

## Clarifications

### Session 2026-03-14

- Q: How should users authenticate during signup and login? → A: User chooses ONE method: (1) Email/password with email verification, OR (2) Phone number with OTP verification, OR (3) Google OAuth (no additional verification needed)
- Q: What should happen to user data (generated documents, chat history, analytics) when a user cancels their subscription or deletes their account? → A: Retain data for 30 days after cancellation, then permanently delete (no export option)
- Q: What is the target concurrent user capacity for the MVP phase (first 3-6 months)? → A: No specific limit, scale dynamically based on load
- Q: What should happen if the AI API (Gemini) is unavailable or rate-limited during peak usage? → A: Multiple AI providers (Gemini primary, OpenAI backup) with automatic failover
- Q: How should the system notify admins when critical issues occur (payment failures, API outages, security breaches, high error rates)? → A: Email alerts to admin + Slack webhook for critical issues
- Q: Should the platform include native mobile apps or just responsive web? → A: Both - responsive web app (Next.js) for desktop/mobile browsers AND native iOS/Android apps (Expo/React Native) with shared backend API and React hooks

## User Scenarios & Testing *(mandatory)*

### User Story 0 - User Signs Up with Choice of Authentication Method (Priority: P1)

A new teacher visits the platform and clicks "Sign Up". The system displays three authentication options: "Email/Password", "Phone Number", or "Continue with Google".

**Option 1 - Email/Password**: User enters email (teacher@example.com), password, full name, and selects role "Teacher". System sends 6-digit verification code to email (expires in 10 minutes). User enters the code. Verification succeeds. System creates account and starts 14-day free trial.

**Option 2 - Phone Number**: User enters phone number (+92-300-1234567), full name, and selects role "Teacher". System sends SMS OTP (expires in 5 minutes). User enters the OTP. Verification succeeds. System creates account and starts 14-day free trial.

**Option 3 - Google OAuth**: User clicks "Continue with Google", selects Google account, grants permissions. System retrieves email and name from Google, prompts user to select role "Teacher". No additional verification needed. System creates account and starts 14-day free trial.

All users are redirected to dashboard with welcome message: "Welcome! Your 14-day trial has started. Explore the platform and upgrade anytime."

**Why this priority**: Flexible authentication improves user onboarding by letting users choose their preferred method. Email verification prevents fake accounts, phone OTP validates Pakistani numbers for payment gateways (JazzCash/EasyPaisa), and Google OAuth provides fastest signup for users with Google accounts.

**Independent Test**: Can be fully tested by signing up with each method (email, phone, Google), verifying codes work, testing invalid formats, checking duplicate prevention, and verifying trial activation.

**Acceptance Scenarios**:

1. **Given** a user visits signup page, **When** they see authentication options, **Then** system displays three buttons: "Email/Password", "Phone Number", "Continue with Google"
2. **Given** user selects Email/Password, **When** they enter email, password, name, and role, **Then** system validates email format and password strength (min 8 chars, 1 uppercase, 1 number, 1 special char)
3. **Given** user submits email signup, **When** validation passes, **Then** system sends 6-digit verification code to email (expires in 10 minutes)
4. **Given** user enters email verification code, **When** code is correct, **Then** system creates account, activates trial, and logs user in
5. **Given** user selects Phone Number, **When** they enter phone and role, **Then** system validates Pakistani phone format (+92-3XX-XXXXXXX) and sends SMS OTP (expires in 5 minutes)
6. **Given** user enters phone OTP, **When** code is correct, **Then** system creates account, activates trial, and logs user in
7. **Given** user selects Google OAuth, **When** they complete Google authentication, **Then** system retrieves email/name, prompts for role selection, creates account without additional verification
8. **Given** user enters wrong verification code 3 times, **When** attempts exceeded, **Then** system blocks signup for 15 minutes and displays "Too many attempts. Try again later."
9. **Given** email or phone already registered, **When** user tries to signup, **Then** system displays "Email/Phone already registered. Please login or use forgot password."
10. **Given** user doesn't verify within 24 hours, **When** verification expires, **Then** system deletes unverified account and allows re-registration

---

### User Story 1 - Lawyer Analyzes Case Strategy and Generates Bail Application (Priority: P1)

A lawyer has a client charged under Section 302 PPC (murder). The lawyer opens the chat and describes: "Client was present at scene but claims self-defense. Two eyewitnesses, one favorable. What are chances of bail?" The AI analyzes similar cases from the database, finds precedents where bail was granted in self-defense claims, calculates success probability (65% based on 20 similar cases), and recommends strategy: "File bail under Section 497 CrPC citing self-defense. Emphasize favorable witness. Cite Mst. Safia Bibi vs State (2018) where bail granted in similar circumstances." The lawyer asks follow-up: "What if prosecution has forensic evidence?" AI adjusts analysis. Once strategy is clear, lawyer requests: "Draft bail application for FIR 123/2026". The system collects required fields (petitioner details, police station, court) and generates a properly formatted Word document following Pakistani court standards.

**Why this priority**: This demonstrates the platform's core value: AI-powered strategic guidance combined with document generation. It validates both the conversational intelligence and the agentic workflow capabilities in a real-world legal scenario.

**Independent Test**: Can be fully tested by describing a case scenario, receiving AI strategy analysis with success probability and precedent citations, asking follow-up questions, then generating a bail application document.

**Acceptance Scenarios**:

1. **Given** a lawyer describes a case scenario, **When** AI analyzes it, **Then** AI provides success probability percentage based on similar cases in database with citations
2. **Given** AI provides initial analysis, **When** lawyer asks "what if" follow-up questions, **Then** AI adjusts analysis based on new information while maintaining conversation context
3. **Given** lawyer decides to proceed, **When** they request bail application, **Then** system identifies missing required fields and prompts for them
4. **Given** all required fields are provided, **When** the system generates the document, **Then** it retrieves relevant PPC/CrPC sections and includes AI-recommended strategy points
5. **Given** the document is generated, **When** the lawyer downloads it, **Then** it is a .docx file formatted to Pakistani court standards (Legal size: 8.5" x 14", margins: 1" top/bottom, 1.25" left/right)

---

### User Story 2 - User Subscribes to Premium Plan with Payment Gateway (Priority: P1)

A teacher completes the 14-day free trial (10 documents, 50 queries used) and receives a notification: "Your trial ends in 2 days. Upgrade to continue using the platform." They click "Upgrade" and see subscription options: Basic (PKR 500/month - 50 documents, 200 queries), Pro (PKR 800/month - 150 documents, unlimited queries), Premium (PKR 1200/month - unlimited documents, priority support). Teacher selects "Pro - 6 Months" (PKR 4500, saves PKR 300). Payment options appear: JazzCash, EasyPaisa, Debit/Credit Card. Teacher selects "Credit Card", enters card details in secure payment form, confirms payment. System verifies payment via webhook, activates subscription immediately, and updates user dashboard showing "Pro Plan Active - Valid until 2026-09-14, 150 documents remaining this month".

**Why this priority**: Payment and subscription management is critical for revenue generation. Without this, the platform cannot sustain operations or scale. This validates the entire business model.

**Independent Test**: Can be fully tested by completing free trial, selecting a subscription plan, making payment via test gateway, verifying subscription activation, and confirming usage limits are updated.

**Acceptance Scenarios**:

1. **Given** a user's free trial is at 80% usage, **When** they log in, **Then** system displays warning banner "You've used 8/10 documents. Upgrade to continue."
2. **Given** a user's trial expires, **When** they attempt to generate a document, **Then** system blocks action and shows "Trial expired. Please subscribe to continue" with upgrade button
3. **Given** a user clicks "Upgrade", **When** subscription page loads, **Then** it displays 3 tiers (Basic/Pro/Premium) with features, pricing for Monthly/6-Month/Yearly, and role-specific pricing
4. **Given** a user selects a plan, **When** they proceed to payment, **Then** system shows payment options (JazzCash, EasyPaisa, Debit/Credit Card) with secure payment forms
5. **Given** a user completes payment via card, **When** payment gateway confirms, **Then** system activates subscription immediately, updates usage limits, and sends confirmation email
6. **Given** a user completes payment via JazzCash/EasyPaisa, **When** webhook receives confirmation, **Then** system activates subscription within 30 seconds
7. **Given** a subscription is active, **When** user reaches 80% of monthly limits, **Then** system displays notification "You've used 120/150 documents this month"
8. **Given** a subscription expires, **When** user logs in, **Then** system blocks usage but preserves all data and shows "Subscription expired. Renew to continue"

---

### User Story 3 - Admin Creates New Professional Role (Priority: P2)

An admin wants to add support for doctors to the platform. They navigate to "Role Management" in the admin dashboard and click "Create New Role". They fill in the form: Role Name: "doctor", Display Name: "Medical Doctor", Category: "healthcare", AI Persona: "You are a medical professional assistant with expertise in Pakistani healthcare regulations and clinical protocols". They define sidebar features: ["Medical Protocols", "Pharmaceutical Guidelines", "Patient Reports", "Clinical Standards"]. The admin then uploads initial documents (Pakistan Medical Commission guidelines, essential medicines list, medical report templates). Once saved, "Doctor" appears as an available role for user assignment. When a doctor logs in, they see only healthcare-related documents and the AI uses medical terminology.

**Why this priority**: Dynamic role creation is the foundation of platform scalability. Without this, every new profession requires developer intervention and code deployment. This enables the platform to serve unlimited professional domains through admin configuration alone.

**Independent Test**: Can be fully tested by admin creating a new role (e.g., "accountant"), uploading finance documents, assigning the role to a test user, logging in as that user, and verifying only finance documents are accessible with appropriate UI features.

**Acceptance Scenarios**:

1. **Given** an admin is in the admin dashboard, **When** they navigate to "Role Management" and click "Create New Role", **Then** a form appears with fields: role_name, display_name, category, ai_persona_prompt, sidebar_features (array)
2. **Given** an admin fills the role creation form, **When** they click "Save", **Then** the new role is created with status='active' and appears in the roles list
3. **Given** a new role is created, **When** admin uploads documents for this role, **Then** documents are tagged with the new role_id and category
4. **Given** a user is assigned the new role, **When** they log in and select that role, **Then** the UI displays role-specific sidebar features and AI uses the configured persona
5. **Given** a user with the new role queries documents, **When** the RAG system searches, **Then** only documents matching the role's category are retrieved

---

### User Story 4 - Doctor Subscribes to Exam Prep Add-On and Practices MCQs (Priority: P2)

A doctor with an active Pro subscription (PKR 3000/month) wants to prepare for PMDC licensing exam. They navigate to "Add-Ons" in their dashboard and see "Medical Exam Preparation - PKR 1500/month". The description shows: "Access 5000+ MCQs from USMLE, PLAB, PMDC exams with detailed explanations, timed practice tests, performance analytics, and weak area identification." Doctor clicks "Subscribe", selects payment method (JazzCash), completes payment. The "Exam Prep" section appears in sidebar. Doctor clicks it and sees subjects: Anatomy, Physiology, Pharmacology, Pathology, Medicine, Surgery. They select "Pharmacology" and choose "Timed Test - 50 questions, 60 minutes". System presents MCQs one by one. After completing, doctor sees score (42/50 - 84%), time taken (52 minutes), and performance breakdown by topic (Cardiovascular: 90%, CNS: 75%, Antibiotics: 80%). Doctor can review incorrect answers with detailed explanations citing textbook references. System tracks progress over time showing improvement trends.

**Why this priority**: Premium add-ons are key revenue drivers and demonstrate platform extensibility. Medical exam prep is a proven market (UWorld, PasTest) with high willingness to pay. This validates the add-on business model.

**Independent Test**: Can be fully tested by subscribing to doctor role, purchasing exam prep add-on, taking a timed MCQ test, reviewing answers with explanations, and viewing performance analytics.

**Acceptance Scenarios**:

1. **Given** a user with active subscription views add-ons, **When** they see available add-ons for their role, **Then** system displays role-specific add-ons (e.g., "Exam Prep" for doctors, "Student Exam Prep" for teachers)
2. **Given** a user subscribes to exam prep add-on, **When** payment is confirmed, **Then** "Exam Prep" section appears in sidebar with access to question banks
3. **Given** a doctor accesses exam prep, **When** they select a subject, **Then** system shows options: Practice Mode (untimed, immediate feedback), Test Mode (timed, feedback after completion), Review Mode (previously attempted questions)
4. **Given** a doctor starts a timed test, **When** they answer questions, **Then** system tracks time, prevents navigation away, and auto-submits at time limit
5. **Given** a doctor completes a test, **When** results are displayed, **Then** system shows score, time taken, correct/incorrect breakdown, and performance by topic with percentages
6. **Given** a doctor reviews incorrect answers, **When** they view explanations, **Then** system displays detailed explanation with textbook references, related concepts, and option to bookmark for later review
7. **Given** a doctor uses exam prep over time, **When** they view analytics, **Then** system displays progress trends (score improvement, weak areas, topics mastered, total questions attempted)

---

### User Story 5 - Admin Reviews and Approves User-Contributed Document (Priority: P2)

A lawyer uploads a recent Supreme Court judgment on bail matters. The system analyzes the PDF, extracts metadata (case name, court, date, relevant sections), generates a summary, and assigns a quality score. The document appears in the Admin Dashboard's "Pending Queue" with status='pending'. An admin reviews the AI-generated summary, verifies the document is legitimate, and clicks "Approve". The document is then indexed into the vector database and becomes searchable by all users with the 'lawyer' or 'magistrate' roles.

**Why this priority**: Human-in-the-loop (HITL) content approval is critical for maintaining knowledge base quality across all professional domains. This prevents polluted or incorrect information from entering the RAG system, which could lead to professional errors.

**Independent Test**: Can be fully tested by uploading a sample document as any professional user, verifying it appears in the admin pending queue with AI-generated metadata, approving it as an admin, and confirming it becomes searchable by users with matching roles.

**Acceptance Scenarios**:

1. **Given** a user uploads a PDF document, **When** the upload completes, **Then** the document status is set to 'pending' and is NOT queryable by the RAG system
2. **Given** a document is uploaded, **When** the AI reviewer agent processes it, **Then** it extracts metadata (type, category, date, relevant sections) and generates a 3-5 sentence summary with a quality score (0-100)
3. **Given** an admin views the pending queue, **When** they see the document with AI-generated metadata, **Then** they can approve (status='approved') or reject (status='rejected') with a reason
4. **Given** a document is approved, **When** the approval action completes, **Then** the document is embedded and indexed in the vector database and becomes searchable by users with matching role/category

---

### User Story 6 - Teacher Creates Multiple Document Types from Textbook (Priority: P3)

A teacher preparing for 10th grade Mathematics exam opens the chat and says "I need materials for Chapter 5: Quadratic Equations". The AI asks: "What would you like to create? I can generate: MCQs, worksheets, lesson planner, rubrics, test papers, or question papers." Teacher selects "worksheet and MCQs". For the worksheet, AI generates 10 practice problems with varying difficulty. For MCQs, it creates 15 questions with 4 options each and correct answers marked. Teacher then asks: "Also create a rubric for grading the worksheet." AI generates a grading rubric with criteria (accuracy, method, presentation) and point distribution. All documents are exported as formatted Word files following Punjab Board standards.

**Why this priority**: This validates the platform's domain-adaptability and generic document template system. Teachers need multiple document types (not just MCQs), and the system must support this through flexible templates without hardcoded workflows.

**Independent Test**: Can be fully tested by creating a teacher account, uploading a sample textbook chapter, requesting multiple document types (planner, worksheet, rubric, MCQs), and verifying each output is properly formatted.

**Acceptance Scenarios**:

1. **Given** a teacher requests document creation, **When** AI responds, **Then** it offers multiple document type options (MCQs, worksheets, planners, rubrics, tests, question papers)
2. **Given** teacher selects a document type, **When** the system generates it, **Then** it retrieves only documents with category='education' from the vector database
3. **Given** the system generates multiple document types, **When** the teacher downloads them, **Then** each is formatted according to its specific template (A4 paper, appropriate structure)
4. **Given** a teacher queries the system, **When** they search for legal content, **Then** the system returns zero results (role-gated access prevents cross-domain queries)

---

### User Story 7 - Admin Adjusts Subscription Pricing in Real-Time (Priority: P3)

An admin notices that teacher subscriptions are lower than expected and decides to run a promotion. They log into the admin dashboard, navigate to "Subscription Management", and see a table of all roles with their current pricing (Basic/Pro/Premium for Monthly/6-Month/Yearly). Admin clicks "Edit Pricing" for Teacher role, changes Pro Monthly from PKR 800 to PKR 600 (25% discount), sets effective date as "Immediate", and adds a note "Back to School Promotion - Valid until 2026-04-30". System updates pricing instantly. New signups see the discounted price. Existing users on renewal see the new price. Admin also adjusts free trial settings: changes trial duration from 14 days to 21 days and increases limits from 10 documents to 15 documents for teachers to encourage adoption. Dashboard shows "Pricing updated successfully. 3 new teacher signups in last hour."

**Why this priority**: Dynamic pricing control is essential for market responsiveness, promotions, and competitive positioning. Admins need flexibility to adjust pricing without developer intervention.

**Independent Test**: Can be fully tested by admin changing subscription prices for a role, verifying new signups see updated pricing, checking existing users see new price on renewal, and confirming free trial limits are updated.

**Acceptance Scenarios**:

1. **Given** an admin views subscription management, **When** the page loads, **Then** it displays a table with all roles, their current pricing (Basic/Pro/Premium × Monthly/6-Month/Yearly), and free trial settings (duration in days, document limit, query limit)
2. **Given** an admin clicks "Edit Pricing" for a role, **When** they modify prices, **Then** system validates prices are positive numbers and saves changes with effective date
3. **Given** pricing is updated, **When** new users sign up, **Then** they see the updated pricing immediately
4. **Given** pricing is updated, **When** existing users renew, **Then** they are charged the new price (not old price)
5. **Given** an admin adjusts free trial settings, **When** they change duration (7/14/21/30 days) or limits (documents, queries), **Then** new users receive the updated trial configuration
6. **Given** an admin views pricing history, **When** they click "View History", **Then** system displays all pricing changes with timestamps, old/new values, and admin who made the change

---

### User Story 8 - User Receives Subscription Expiry Warnings and Data Preservation (Priority: P2)

A lawyer's annual subscription (PKR 30,000/year) is approaching expiry. At 30 days before expiry, user receives email: "Your subscription expires on 2026-04-14. Renew now to avoid interruption." At 7 days before, dashboard shows prominent banner: "Your subscription expires in 7 days. Renew now." At 80% of monthly usage (120/150 documents), user sees notification: "You've used 120/150 documents this month. Upgrade to Premium for unlimited." On expiry day, user logs in and sees: "Your subscription has expired. All your data is safe. Renew to continue." User cannot generate documents or make queries, but can view past generated documents and chat history. User clicks "Renew", selects same plan, completes payment, and access is restored immediately with all data intact.

**Why this priority**: User retention depends on timely reminders and seamless renewal. Data preservation builds trust and prevents user frustration. This reduces churn and improves lifetime value.

**Independent Test**: Can be fully tested by creating a subscription with near-expiry date, verifying warnings appear at 30/7 days, confirming usage warnings at 80%, testing post-expiry blocked access, and verifying data preservation after renewal.

**Acceptance Scenarios**:

1. **Given** a subscription is 30 days from expiry, **When** the system runs daily checks, **Then** it sends email reminder to user with renewal link
2. **Given** a subscription is 7 days from expiry, **When** user logs in, **Then** dashboard displays prominent warning banner with "Renew Now" button
3. **Given** a user reaches 80% of monthly limits, **When** they perform an action, **Then** system displays notification "You've used X/Y resources. Upgrade or wait for monthly reset."
4. **Given** a subscription expires, **When** user logs in, **Then** system displays "Subscription expired" message, blocks document generation and queries, but allows viewing past data
5. **Given** a subscription is expired, **When** user clicks "Renew", **Then** system shows same subscription options with "Renew" instead of "Subscribe" and applies any loyalty discounts
6. **Given** a user renews after expiry, **When** payment is confirmed, **Then** system immediately restores access, resets monthly limits, and preserves all historical data (documents, chats, analytics)

---

### User Story 9 - Doctor Generates Medical Report (Priority: P6)

A doctor needs to generate a patient medical report following Pakistan Medical Commission standards. They open the chat and say "Generate medical report for patient with diagnosis: Type 2 Diabetes Mellitus". The system retrieves relevant medical protocols and report templates from the healthcare category. It prompts the doctor for required fields (patient name, age, medical history, examination findings, prescribed medications). Once all fields are collected, the system generates a properly formatted medical report (.docx) following PMC guidelines with appropriate medical terminology and prescription format.

**Why this priority**: This demonstrates the platform's extensibility to healthcare domain, validating that the dynamic role system works for professions beyond legal/education. It proves any admin-created role can have custom workflows.

**Independent Test**: Can be fully tested by admin creating "doctor" role with healthcare documents, assigning role to test user, generating a medical report, and verifying it follows medical formatting standards.

**Acceptance Scenarios**:

1. **Given** a doctor is logged in, **When** they request a medical report, **Then** the system retrieves only documents with category='healthcare'
2. **Given** the system collects patient information, **When** all required fields are provided, **Then** it generates a report following PMC formatting standards
3. **Given** the report is generated, **When** the doctor downloads it, **Then** it includes proper medical terminology, prescription format, and doctor's signature block
4. **Given** a doctor queries legal or education content, **When** they search, **Then** the system returns zero results (role-gated access)

---

### User Story 15 - Executive Engineer Handles Project Delay with AI Guidance (Priority: P4)

An executive engineer's road construction project is 6 months behind schedule due to land acquisition delays. The engineer opens the chat and asks: "Project delayed 6 months due to land acquisition issues. What applications do I need to file?" The AI searches NHA (National Highway Authority) policies and engineering regulations, then responds: "You need to file: 1) Time Extension Application (Form NHA-TE-01) citing land acquisition delay, 2) Revised Project Completion Certificate, 3) Delay Justification Report. According to NHA Manual Section 8.4.2, land acquisition delays are valid grounds for extension without penalty. Would you like me to generate these documents?" Engineer confirms. AI collects project details (project name, original completion date, delay reason, supporting documents) and generates all three documents with proper NHA formatting and required fields pre-filled.

**Why this priority**: This demonstrates situation analysis with rule-based recommendations. Engineers face complex scenarios requiring both policy guidance and document generation, validating the platform's strategic advisory capabilities.

**Independent Test**: Can be fully tested by creating an executive engineer account, describing a project delay scenario, receiving AI recommendations with policy citations, and generating required documents.

**Acceptance Scenarios**:

1. **Given** an executive engineer describes a project situation, **When** AI analyzes it, **Then** it searches engineering policies and provides specific action items with form numbers and section citations
2. **Given** AI recommends multiple documents, **When** engineer confirms, **Then** system collects required fields for all documents in a single workflow
3. **Given** all fields are collected, **When** documents are generated, **Then** they follow NHA/engineering standards with proper formatting and pre-filled data
4. **Given** an engineer queries non-engineering content, **When** they search, **Then** the system returns zero results (role-gated access)

---

### User Story 16 - Teacher Uploads Scanned Textbook with OCR (Priority: P4)

A teacher has a scanned Punjab Board Science textbook (image-based PDF with pictures and diagrams). They upload it to the platform. The AI uses vision capabilities to extract text from the scanned pages and identifies diagrams/images. The system processes the 200-page book in 5 minutes, extracting text with 95% accuracy and preserving image references. Teacher then asks: "Create worksheet with 5 fill-in-the-blank questions and 3 diagram labeling exercises from Chapter 3: Chemical Reactions." AI retrieves the extracted text and diagrams, generates worksheet with questions, and includes diagram images for labeling exercises. Teacher downloads formatted worksheet ready for printing.

**Why this priority**: Many educational and professional documents in Pakistan are scanned/image-based. OCR/Vision capability is essential for the platform to handle real-world document formats, not just text-based PDFs.

**Independent Test**: Can be fully tested by uploading a scanned PDF, verifying AI extracts text and images, querying content from the scanned document, and generating documents that include extracted images.

**Acceptance Scenarios**:

1. **Given** a user uploads a scanned/image-based PDF, **When** the system processes it, **Then** it uses OCR/Vision AI to extract text with minimum 90% accuracy
2. **Given** a scanned document is processed, **When** AI extracts content, **Then** it preserves image references and stores them separately for visual reference
3. **Given** a user queries content from scanned document, **When** RAG searches, **Then** it retrieves extracted text and associated images
4. **Given** a user requests document generation with diagrams, **When** system generates it, **Then** it includes relevant images from the scanned source document

---

### User Story 10 - User Interacts via Chat Interface (Priority: P2)

A teacher opens the platform and sees a chat interface similar to Gemini. They type "Show me all available Punjab Board books". The system displays a list of Punjab Board textbooks with subjects and grades. The teacher then asks "Generate 10 MCQs from 10th grade Science, Chapter 3". The system retrieves the chapter, displays its title and topics, and asks "I found Chapter 3: Chemical Reactions (pages 45-62). Is this correct?" The teacher confirms, and the system generates the MCQs. The entire conversation history is preserved and visible in the chat.

**Why this priority**: Chat interface is the primary interaction method for all users. It provides natural language access to all platform features and maintains conversation context, making the system intuitive and accessible.

**Independent Test**: Can be fully tested by opening the chat interface, asking multiple questions in sequence, verifying conversation context is maintained, and confirming chat history persists across sessions.

**Acceptance Scenarios**:

1. **Given** a user opens the platform, **When** they land on the dashboard, **Then** a chat interface is prominently displayed with a text input and conversation history area
2. **Given** a user asks a question in chat, **When** the system responds, **Then** both the user message and system response are added to the conversation history with timestamps
3. **Given** a user has an active conversation, **When** they ask a follow-up question, **Then** the system maintains context from previous messages in the session
4. **Given** a user closes and reopens the platform, **When** they view the chat, **Then** their conversation history from the last 30 days is displayed

---

### User Story 11 - Admin Manages Users and Views Analytics (Priority: P2)

An admin logs into the admin dashboard and sees a "User Management" section showing all registered users with their roles, usage statistics (documents generated, queries made), and account status. The admin notices a user violating terms of service and clicks "Block User". The user is immediately prevented from logging in. The admin also views platform-wide analytics showing total users per role (50 teachers, 30 lawyers, 10 officers), total documents generated this month (250), and storage consumption (350MB of 500MB free tier).

**Why this priority**: User management and analytics are essential admin functions for platform governance, abuse prevention, and capacity planning. This enables admins to monitor platform health and take action on problematic users.

**Independent Test**: Can be fully tested by creating multiple test users, logging in as admin, viewing user list with statistics, blocking a user, verifying blocked user cannot log in, and viewing platform analytics dashboard.

**Acceptance Scenarios**:

1. **Given** an admin logs into the admin dashboard, **When** they navigate to "User Management", **Then** they see a table of all users with columns: email, roles, documents_generated, queries_made, storage_used, account_status
2. **Given** an admin views a user's details, **When** they click "Block User", **Then** the user's account_status changes to 'blocked' and the user cannot log in
3. **Given** an admin views a blocked user, **When** they click "Unblock User", **Then** the user's account_status changes to 'active' and the user can log in again
4. **Given** an admin views the analytics dashboard, **When** the page loads, **Then** they see metrics: total users (by role), documents generated (this month), storage used (MB/GB), API calls (this month), free-tier usage percentage

---

### User Story 12 - User Switches Roles and Sees Adapted Interface (Priority: P4)

A user who is both a lawyer and a teacher (registered with role='lawyer,teacher') logs into the platform. The dashboard shows a role selector. When they select "Lawyer", the sidebar shows "Legal Research", "Bail Applications", "Case Law Library". When they switch to "Teacher", the sidebar changes to "Lesson Plans", "MCQ Generator", "Board Books Library". The AI assistant's persona also adapts (formal legal language vs. educational tone).

**Why this priority**: This demonstrates the "universal dashboard" concept where a single frontend adapts to multiple professional domains. While lower priority than core workflows, it's essential for the platform's scalability to new verticals.

**Independent Test**: Can be fully tested by creating a multi-role user account, logging in, switching between roles, and verifying the UI (sidebar, agent persona, available features) changes appropriately.

**Acceptance Scenarios**:

1. **Given** a user with multiple roles logs in, **When** the dashboard loads, **Then** a role selector dropdown appears with all assigned roles
2. **Given** the user selects "Lawyer" role, **When** the interface updates, **Then** the sidebar shows legal-specific features and the AI assistant uses formal legal language
3. **Given** the user switches to "Teacher" role, **When** the interface updates, **Then** the sidebar shows education-specific features and the AI assistant uses educational tone
4. **Given** the user is in "Lawyer" mode, **When** they attempt to access teacher-only features, **Then** the system denies access with a message "This feature is only available for Teacher role"

**NOTE**: This user story is marked as DEPRECATED in favor of single-role-per-user model. Users select ONE role during signup and cannot switch. Keeping for reference only.

---

### User Story 13 - Magistrate Researches Legal Provisions (Priority: P5)

A magistrate logs into the platform and asks "What are the procedural requirements for granting bail under Section 497 CrPC?" The system retrieves relevant sections from the Code of Criminal Procedure and displays them with citations. The magistrate then asks "Show me recent Supreme Court judgments on bail conditions". The system searches the legal document database (category='legal') and presents summaries of relevant case law. The magistrate can also upload new judicial orders as contributions for admin approval.

**Why this priority**: Magistrates are a distinct user group within the legal domain with judicial perspective needs. Supporting them validates the platform's comprehensiveness for the legal vertical.

**Independent Test**: Can be fully tested by creating a magistrate account, querying legal provisions, verifying only legal documents are retrieved, uploading a judicial order, and confirming it appears in admin pending queue.

**Acceptance Scenarios**:

1. **Given** a magistrate is logged in, **When** they query legal provisions, **Then** the system retrieves documents with category='legal' (same as lawyers)
2. **Given** a magistrate uploads a judicial order, **When** the upload completes, **Then** it appears in the admin pending queue with status='pending'
3. **Given** a magistrate asks about procedural law, **When** the system responds, **Then** it uses formal judicial language appropriate for magistrates
4. **Given** a magistrate attempts to access education content, **When** they query, **Then** the system returns zero results (role-gated access)

---

### User Story 14 - Town Officer Resolves Complex Policy Query (Priority: P3)

A town officer receives a query from an employee: "I worked July-December in Office A, now transferred to Office B. Who writes my ACR (Annual Confidential Report)?" The officer opens the chat and asks: "Employee worked 6 months in previous office, now transferred. ACR responsibility?" The AI searches government service rules, finds Punjab Civil Servants Act 1974, Section 15(3), and responds: "According to Punjab Civil Servants Act 1974, Section 15(3): ACR for period July-Dec must be written by Office A (where employee served). Current Office B writes ACR only for period after transfer. Employee must request Office A to complete ACR for July-Dec period. Reference: Establishment Division Notification No. 4/2/2010 dated 15-03-2010." The officer asks follow-up: "What if Office A refuses?" AI provides escalation procedure with exact sections and forms required.

**Why this priority**: This demonstrates the platform's ability to handle complex, context-dependent policy queries requiring multi-document reasoning. Town officers deal with nuanced administrative situations that need precise rule citations.

**Independent Test**: Can be fully tested by creating a town officer account, asking complex policy questions with multiple conditions, verifying AI provides exact section citations, and confirming follow-up questions maintain context.

**Acceptance Scenarios**:

1. **Given** a town officer asks a complex policy question, **When** AI searches, **Then** it retrieves documents with category='government' and provides exact section/clause citations
2. **Given** AI provides initial answer, **When** officer asks "what if" follow-up, **Then** AI maintains context and provides additional guidance with new citations
3. **Given** AI cites a section, **When** officer requests to see the full text, **Then** AI displays the complete section from the source document
4. **Given** a town officer attempts to access legal or education content, **When** they query, **Then** the system returns zero results (role-gated access)

---

### Edge Cases

- What happens when a user signs up with Google but Google account has no verified email? System must reject signup and display "Google account must have a verified email address."
- What happens when a user signs up with phone number but SMS delivery fails? System must retry SMS once after 30 seconds, then display "SMS delivery failed. Please try email signup or contact support."
- What happens when a user signs up with email but never receives verification code? System must provide "Resend Code" button with 60-second cooldown and check spam folder message.
- What happens when a user who signed up with Google tries to subscribe but has no phone number? System must prompt "Phone number required for payment gateway. Please add your phone number to continue." and allow linking phone number.
- What happens when a user tries to link a phone number that's already registered to another account? System must display "This phone number is already registered to another account."
- What happens when a user uploads a corrupted or non-PDF file? System must reject with clear error message "Only PDF files are supported. Please upload a valid PDF document."
- What happens when the AI cannot extract metadata from an uploaded document? System must flag it for manual admin review with status='needs_manual_review' and notify admin.
- What happens when a lawyer requests a document but provides incomplete information after 3 prompts? System must save the partial draft with status='incomplete' and allow resuming later.
- What happens when the RAG system finds no relevant documents for a query? System must respond "I cannot find this information in the official records. Please try rephrasing your query or contact support."
- What happens when free-tier limits are exceeded (storage, API calls)? System must display warning at 80% usage and block new uploads/queries at 100% with upgrade prompt.
- What happens when two admins try to approve/reject the same document simultaneously? System must use optimistic locking to prevent conflicts, showing "This document was already processed by another admin."
- What happens when a user exceeds their subscription quota (queries or documents)? System must display "You have reached your monthly limit. Upgrade to higher tier or wait for monthly reset on [date]." and prevent further actions.
- What happens when a blocked user tries to log in? System must display "Your account has been blocked. Please contact support." and prevent authentication.
- What happens when chat history exceeds 30 days? System must automatically archive old conversations and display "Older conversations have been archived" with option to view archives.
- What happens when a user asks for confirmation but the AI found multiple matching chapters/documents? System must display all matches with details and ask "Which one would you like to use?" before proceeding.
- What happens when a user provides their own sample document but it doesn't match the required format? System must analyze the sample, extract the structure, and ask "I detected this format: [description]. Should I use this for generation?"
- What happens when a payment gateway transaction fails or times out? System must display "Payment failed. Please try again or use a different payment method." and log the failed transaction for admin review.
- What happens when a card payment is declined by the bank? System must display specific error message from gateway (insufficient funds, card expired, etc.) and allow user to try different card or payment method.
- What happens when a user tries to downgrade from Premium to Basic mid-cycle? System must allow downgrade effective next billing cycle and display "Your plan will change to Basic on [date]. You'll keep Premium access until then."
- What happens when a subscription payment fails on auto-renewal? System must retry payment 3 times over 7 days, send email reminders, then suspend account with grace period showing "Payment failed. Update payment method to restore access."
- What happens when a user cancels subscription? System must confirm cancellation, continue access until end of billing period, then block usage but preserve data for 30 days. After 30 days, all user data (documents, chats, analytics) is permanently deleted with no option to recover.
- What happens when exam prep add-on subscription expires but base subscription is active? System must remove "Exam Prep" section from sidebar, block access to question banks, but preserve performance history and allow re-subscription.
- What happens when a doctor attempts 100+ MCQs in one session? System must allow unlimited attempts within subscription limits but warn after 2 hours: "You've been practicing for 2 hours. Take a break for better retention."
- What happens when multiple users from same organization try to share one account? System must detect concurrent logins from different IPs and display warning "Multiple simultaneous logins detected. Each user needs their own account per Terms of Service."
- What happens when admin sets negative pricing or zero pricing? System must validate and reject with error "Pricing must be positive. Enter amount greater than 0."
- What happens when a user's role is deactivated by admin while they have active subscription? System must notify user "Your role has been discontinued. Contact support for refund or role migration options." and suspend access.
- What happens when Kubernetes pod crashes during document generation? System must detect workflow interruption, mark workflow as 'failed', allow user to retry, and log error for admin investigation.
- What happens when JazzCash/EasyPaisa webhook is delayed beyond 5 minutes? System must show "Payment processing. This may take a few minutes." and poll gateway status every 30 seconds for up to 10 minutes before timing out.
- What happens when a user enters invalid card details? System must display real-time validation errors (invalid card number, expired date, invalid CVV) before submission.
- What happens when admin changes trial duration from 14 days to 7 days? System must apply new duration only to new signups; existing trial users keep their original 14-day period.
- What happens when Gemini API is down or rate-limited? System must automatically failover to OpenAI backup provider within 3 seconds, log the failover event, and continue serving user requests without interruption.
- What happens when both Gemini and OpenAI APIs are unavailable? System must return cached response if query is similar to recent queries (cache hit), otherwise display "AI service temporarily unavailable. Please try again in a few minutes." and queue request for retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide three authentication methods at signup: (1) Email/password with email verification (6-digit code, 10-minute expiry), OR (2) Phone number with SMS OTP (6-digit code, 5-minute expiry), OR (3) Google OAuth (no additional verification)
- **FR-002**: System MUST validate email format and password strength (min 8 chars, 1 uppercase, 1 number, 1 special char) for email/password signup
- **FR-003**: System MUST validate Pakistani phone number format (+92-3XX-XXXXXXX) for phone number signup
- **FR-004**: System MUST integrate Google OAuth 2.0 for social login, retrieving email and name from Google account
- **FR-005**: System MUST block signup attempts for 15 minutes after 3 failed verification code attempts (email or phone)
- **FR-006**: System MUST delete unverified accounts after 24 hours if email/phone verification not completed (does not apply to Google OAuth signups)
- **FR-007**: System MUST prevent duplicate registrations by checking email and phone uniqueness before sending verification codes or creating OAuth accounts
- **FR-008**: System MUST support "Resend Code" functionality with 60-second cooldown between resend attempts for email and phone verification
- **FR-009**: System MUST activate free trial (configurable duration and limits) immediately after successful verification or OAuth completion
- **FR-010**: System MUST allow users to link additional authentication methods after signup (e.g., user who signed up with Google can add phone number for payment gateway compatibility)
- **FR-011**: System MUST enforce role-based access control where users can only query documents matching their assigned role's category (dynamically determined by role configuration)
- **FR-012**: System MUST implement Row-Level Security (RLS) at the database level to ensure tenant isolation, filtering all queries by tenant_id
- **FR-013**: System MUST validate all uploaded files are PDFs under 10MB and reject other formats with clear error messages
- **FR-014**: System MUST extract metadata from uploaded documents (title, author, date, category, relevant sections, domain-specific attributes) using AI analysis
- **FR-015**: System MUST assign status='pending' to all user-uploaded documents and prevent them from being queryable until approved
- **FR-103**: System MUST provide an Admin Dashboard showing pending documents with AI-generated summaries and quality scores
- **FR-104**: Admins MUST be able to approve (status='approved') or reject (status='rejected') documents with mandatory rejection reason
- **FR-105**: System MUST embed approved documents into the vector database and make them searchable by users with matching role/category
- **FR-106**: System MUST implement agentic workflows for document generation that verify all required fields are collected before generation
- **FR-107**: System MUST generate Word (.docx) documents formatted according to domain-specific standards (dynamically determined by role configuration)
- **FR-108**: System MUST respond with "I cannot find this in the official records" when RAG retrieval confidence is below 0.75 threshold
- **FR-109**: System MUST log all data access attempts with tenant_id, user_id, document_id, and timestamp for audit purposes
- **FR-110**: System MUST track subscription usage (database size, file storage, API calls, documents generated, queries made) and alert at 80% of limits
- **FR-111**: System MUST support both web and mobile clients through a unified REST API
- **FR-112**: System MUST adapt the user interface (sidebar, features, AI persona) based on the user's assigned role configuration
- **FR-113**: Mobile apps MUST support biometric authentication (Face ID, Touch ID, fingerprint) for quick login after initial authentication
- **FR-114**: Mobile apps MUST implement offline storage for chat history (last 50 messages) and generated documents (last 20 documents) using Expo SecureStore
- **FR-115**: Mobile apps MUST sync offline data when network connection is restored with conflict resolution (server wins)
- **FR-116**: Mobile apps MUST support push notifications for subscription expiry warnings, document generation completion, and admin announcements
- **FR-117**: Mobile apps MUST implement pull-to-refresh for chat history, documents list, and subscription status
- **FR-118**: Mobile apps MUST support file sharing (generated documents) via native share sheet to other apps (WhatsApp, Email, Drive)
- **FR-119**: Mobile apps MUST support camera integration for document upload (scan documents with camera)
- **FR-120**: Mobile apps MUST implement deep linking for payment confirmation redirects from JazzCash/EasyPaisa mobile apps
- **FR-121**: Mobile apps MUST display network status indicator and gracefully handle offline mode with appropriate error messages
- **FR-122**: Mobile apps MUST support dark mode based on device system preferences
- **FR-016**: System MUST refuse non-professional queries (entertainment, personal advice) with message "This platform is designed for professional use only"
- **FR-017**: System MUST persist incomplete document generation workflows to allow users to resume later
- **FR-018**: System MUST support Urdu/English bilingual content for Pakistani documents where applicable
- **FR-019**: System MUST provide admin interface to view all users with their roles, usage statistics (documents_generated, queries_made, storage_used), subscription status, and account status
- **FR-020**: Admins MUST be able to block/unblock users, with blocked users prevented from logging in and shown "Your account has been blocked" message
- **FR-021**: System MUST display platform-wide analytics to admins including total users per role, revenue per role, documents generated per month, storage consumption, API usage, and subscription distribution
- **FR-022**: System MUST enforce per-user subscription tier limits (Basic: 50 docs/200 queries, Pro: 150 docs/unlimited queries, Premium: unlimited) and prevent actions when limits exceeded
- **FR-023**: System MUST display remaining usage to users in dashboard (e.g., "42 documents remaining this month, resets on 2026-04-01")
- **FR-024**: System MUST display retrieved document/chapter details (title, page range, topics) and request user confirmation with "Is this correct?" before starting document generation
- **FR-025**: System MUST provide chat interface with conversation history, context awareness across messages, and persistence for 30 days
- **FR-026**: System MUST allow users to upload sample documents marked as type='sample_template' for use as generation templates
- **FR-027**: When generating documents, system MUST prioritize user-provided sample templates over default admin-uploaded samples if available
- **FR-028**: System MUST support unlimited professional roles through dynamic role configuration without requiring code changes
- **FR-029**: Users MUST select ONE role during signup and cannot switch roles (single-role-per-user model)
- **FR-030**: Admins MUST be able to create new professional roles with custom name, display_name, category, AI persona prompt, sidebar features configuration, and subscription pricing (Basic/Pro/Premium)
- **FR-031**: Admins MUST be able to upload initial document sets when creating a new role, tagged with the role's category
- **FR-032**: System MUST dynamically generate role-specific UI (sidebar, features, document types) based on admin-defined role configuration
- **FR-033**: Admins MUST be able to deactivate roles (status='inactive'), preventing new user assignments but preserving existing user access
- **FR-034**: System MUST validate role configurations to ensure required fields (name, category, ai_persona, pricing) are provided before activation
- **FR-035**: System MUST support role-specific document formatting standards defined by admin (paper size, margins, structure) and apply them during generation
- **FR-036**: System MUST support OCR and vision AI to extract text and images from scanned/image-based PDF documents with minimum 90% accuracy
- **FR-037**: System MUST provide AI-powered case/situation analysis including success probability assessment, strategic recommendations, and precedent citations
- **FR-038**: System MUST offer strategic guidance and recommendations based on domain-specific rules, policies, and precedents
- **FR-039**: System MUST support generic document template system where admins can define new document types (planners, worksheets, rubrics, forms) without code changes
- **FR-040**: System MUST maintain conversation context across multiple turns (minimum 10 messages) and provide contextual follow-up responses
- **FR-041**: System MUST perform multi-hop reasoning to answer complex queries requiring information synthesis from multiple documents
- **FR-042**: System MUST cite exact sections/clauses/page numbers from source documents when providing guidance or recommendations
- **FR-043**: System MUST support "what-if" scenario analysis where users can ask hypothetical questions and receive adjusted recommendations
- **FR-044**: System MUST support multiple document types per role (e.g., teachers can generate planners, worksheets, rubrics, MCQs, tests, question papers)
- **FR-045**: System MUST extract and store images/diagrams from documents separately for visual reference and inclusion in generated documents
- **FR-046**: System MUST detect whether uploaded PDF is text-based or image-based and apply appropriate extraction method (text parser vs OCR)
- **FR-047**: System MUST provide document template management interface where admins can create, edit, and configure templates for each role
- **FR-048**: System MUST calculate and display confidence scores for AI recommendations and strategic guidance (e.g., "65% success probability based on 20 similar cases")
- **FR-049**: System MUST implement subscription management with three tiers (Basic/Pro/Premium) per role with configurable pricing for Monthly/6-Month/Yearly billing cycles
- **FR-050**: System MUST integrate multiple payment gateways (JazzCash, EasyPaisa, Debit/Credit Card via Stripe or local payment processor) with webhook verification for payment confirmation
- **FR-051**: System MUST provide free trial with configurable duration (7/14/21/30 days) and usage limits (default: 10 documents, 50 queries) before requiring subscription
- **FR-052**: System MUST send subscription expiry warnings at 30 days, 7 days, and on expiry day via email and in-app notifications
- **FR-053**: System MUST display usage warnings when user reaches 80% of monthly limits (documents, queries) with remaining quota
- **FR-054**: System MUST block document generation and queries when subscription expires but preserve all user data (documents, chats, analytics)
- **FR-055**: System MUST allow seamless subscription renewal with immediate access restoration and data preservation
- **FR-056**: Admins MUST be able to adjust subscription pricing per role in real-time and configure free trial settings (duration: 7/14/21/30 days, document limit, query limit) with effective date and pricing history tracking
- **FR-057**: System MUST support premium add-ons (e.g., Medical Exam Prep for doctors) with separate subscription and payment flow
- **FR-058**: Medical Exam Prep add-on MUST provide MCQ question banks categorized by subject/topic with minimum 5000+ questions
- **FR-059**: Medical Exam Prep MUST support Practice Mode (untimed, immediate feedback), Test Mode (timed, feedback after completion), and Review Mode (previously attempted)
- **FR-060**: Medical Exam Prep MUST provide detailed answer explanations with textbook references, related concepts, and bookmark functionality
- **FR-061**: Medical Exam Prep MUST track performance analytics (score trends, time taken, topic-wise breakdown, weak areas, questions attempted over time)
- **FR-062**: System MUST support admin-uploaded question banks, user-contributed questions (HITL approval), and AI-generated questions from medical textbooks for exam prep
- **FR-063**: System MUST allow users to contribute MCQ questions for exam prep with status='pending' until admin approval
- **FR-064**: System MUST handle payment failures with retry logic (3 attempts over 7 days), email reminders, and grace period before suspension
- **FR-065**: System MUST support subscription cancellation with access continuation until end of billing period and 30-day data retention before permanent deletion
- **FR-066**: System MUST detect and prevent account sharing by flagging concurrent logins from different IPs with warning message
- **FR-067**: System MUST validate admin pricing inputs (positive numbers only) and reject invalid values
- **FR-068**: System MUST be containerized using Docker and orchestrated with Kubernetes for horizontal scaling
- **FR-069**: System MUST implement health checks, auto-scaling policies, and graceful degradation for high availability
- **FR-070**: System MUST use managed services (DigitalOcean Managed Kubernetes, Managed PostgreSQL, Managed Redis) for operational simplicity
- **FR-071**: System MUST implement intelligent query caching where identical or semantically similar queries return cached responses (7-day TTL) to reduce AI API costs
- **FR-072**: System MUST normalize queries before caching (lowercase, remove extra spaces, standardize punctuation) to maximize cache hit rate
- **FR-073**: System MUST track cache hit rate per role/category and display in admin analytics dashboard
- **FR-074**: System MUST implement AI model routing based on query complexity: simple queries use cheaper models (Gemini 1.5 Flash or GPT-4o-mini), complex queries use advanced models (Gemini 1.5 Pro or GPT-4o) with automatic failover between providers
- **FR-075**: System MUST determine query complexity using heuristics: word count, technical terminology density, multi-hop reasoning indicators, document generation vs simple Q&A
- **FR-076**: System MUST route AI model selection based on subscription tier: Basic uses cheapest models only (Flash/GPT-4o-mini), Pro uses mixed tier models (70% cheap, 30% advanced), Premium uses advanced models only (Pro/GPT-4o) with automatic provider failover
- **FR-077**: System MUST log AI model usage per user/role for cost analysis and optimization
- **FR-078**: System MUST implement response streaming for long AI responses to improve perceived performance
- **FR-079**: System MUST batch similar queries from multiple users when possible to reduce API calls (e.g., "generate 10 MCQs from Chapter 8" requested by 5 users within 1 hour)
- **FR-080**: System MUST use cheaper embedding models (text-embedding-004) for RAG instead of expensive generative models
- **FR-081**: System MUST implement rate limiting per user based on subscription tier to prevent API abuse
- **FR-082**: System MUST compress and optimize document storage using gzip compression for text content
- **FR-083**: System MUST use CDN (DigitalOcean Spaces with CDN) for serving generated documents and static assets
- **FR-084**: System MUST implement lazy loading for chat history and document lists to reduce initial page load time
- **FR-085**: System MUST use connection pooling for database connections to reduce overhead
- **FR-086**: System MUST implement database query optimization with proper indexing on frequently queried fields (role_id, category, status, user_id)
- **FR-087**: System MUST monitor and alert on cost thresholds (AI API costs, storage costs, bandwidth) with admin notifications at 80% of monthly budget
- **FR-088**: System MUST support card payments (Debit/Credit Card) via Stripe or local Pakistani payment processor with PCI-DSS compliant tokenization
- **FR-089**: System MUST validate card details in real-time (card number format, expiry date, CVV) before payment submission
- **FR-090**: System MUST handle webhook delays from JazzCash/EasyPaisa by polling gateway status every 30 seconds for up to 10 minutes
- **FR-091**: System MUST display specific error messages for card payment failures (insufficient funds, expired card, invalid CVV, etc.) from gateway response
- **FR-092**: System MUST apply trial duration changes only to new signups, preserving existing trial users' original duration
- **FR-093**: System MUST store payment methods securely using tokenization (never store raw card numbers) and allow users to update saved payment methods
- **FR-094**: System MUST implement multi-provider AI failover with Gemini as primary and OpenAI as backup provider
- **FR-095**: System MUST automatically detect AI API failures (timeout, rate limit, 5xx errors) and failover to backup provider within 3 seconds
- **FR-096**: System MUST log all AI provider failover events with timestamp, error reason, and provider switched to for monitoring
- **FR-097**: System MUST maintain consistent AI model tier mapping across providers (Basic tier: cheapest models, Pro: mid-tier, Premium: best models)
- **FR-098**: System MUST track AI API costs per provider and display breakdown in admin analytics dashboard
- **FR-099**: System MUST send email alerts to admin for critical issues: payment failures (>3 consecutive), AI API outages, security breaches (failed login spikes, concurrent IP violations), error rate >5%
- **FR-100**: System MUST integrate Slack webhook for real-time critical issue notifications with structured messages (severity, description, affected users, suggested action)
- **FR-101**: System MUST allow admin to configure alert thresholds (e.g., error rate percentage, payment failure count) and notification recipients (email addresses, Slack channels)
- **FR-102**: System MUST categorize alerts by severity: Critical (immediate action required), Warning (review within 1 hour), Info (daily digest)

### Key Entities

- **Role**: Represents a professional role configuration with attributes: role_id, role_name (unique slug, e.g., 'doctor', 'engineer'), display_name (e.g., 'Medical Doctor'), category (e.g., 'healthcare', 'engineering'), description, ai_persona_prompt (how AI should behave), sidebar_features (array of feature names), document_templates (array of template_ids), document_formatting_rules (JSON: paper_size, margins, structure), subscription_pricing (JSON: {basic: {monthly, six_month, yearly}, pro: {...}, premium: {...}}), created_by (admin_id), created_at, is_active (boolean)
- **Subscription Plan**: Represents a subscription tier with attributes: plan_id, role_id, tier ('basic', 'pro', 'premium'), monthly_price (PKR), six_month_price (PKR), yearly_price (PKR), features (JSON: documents_limit, queries_limit, storage_limit, priority_support, ai_model_tier), trial_duration_days (7/14/21/30), trial_documents_limit, trial_queries_limit, created_at, updated_at, is_active (boolean)
- **User Subscription**: Represents a user's active subscription with attributes: subscription_id, user_id, role_id, plan_id (references Subscription Plan), tier ('basic', 'pro', 'premium'), billing_cycle ('monthly', 'six_month', 'yearly'), start_date, end_date, status ('trial', 'active', 'expired', 'cancelled', 'suspended'), payment_method ('jazzcash', 'easypaisa', 'bank_transfer'), auto_renew (boolean), usage_stats (documents_used, queries_used, storage_used), last_warning_sent (datetime), created_at, updated_at
- **Payment Transaction**: Represents a payment record with attributes: transaction_id, user_id, subscription_id, amount (PKR), currency ('PKR'), payment_method ('jazzcash', 'easypaisa', 'card'), payment_gateway ('jazzcash', 'easypaisa', 'stripe'), payment_gateway_transaction_id, card_last_four (for card payments), card_brand (Visa/Mastercard), status ('pending', 'completed', 'failed', 'refunded'), failure_reason (for failed payments), payment_date, gateway_response (JSON), retry_count (for failed payments), created_at
- **Add-On Subscription**: Represents premium add-on subscriptions with attributes: addon_id, user_id, addon_type ('exam_prep', 'advanced_analytics', 'api_access'), role_id (which roles can access), monthly_price (PKR), status ('active', 'expired', 'cancelled'), start_date, end_date, payment_method, created_at
- **Exam Question**: Represents MCQ questions for exam prep with attributes: question_id, subject (e.g., 'Pharmacology', 'Anatomy'), topic (e.g., 'Cardiovascular', 'CNS'), difficulty ('easy', 'medium', 'hard'), question_text, options (JSON array: [{option: 'A', text: '...', is_correct: boolean}, ...]), explanation (detailed answer explanation), references (textbook citations), source ('admin_upload', 'user_contribution', 'ai_generated'), uploaded_by (user_id), status ('pending', 'approved', 'rejected'), created_at, approved_by (admin_id)
- **Exam Attempt**: Represents a user's exam/test attempt with attributes: attempt_id, user_id, mode ('practice', 'test', 'review'), subject, questions (array of question_ids), answers (JSON: {question_id: selected_option}), score (correct/total), time_taken (seconds), time_limit (seconds for test mode), completed_at, performance_breakdown (JSON: {topic: {correct, total, percentage}}), created_at
- **Document Template**: Represents a document type configuration with attributes: template_id, role_id, template_name (e.g., 'planner', 'worksheet', 'rubric', 'bail_application'), display_name, template_type ('structured', 'freeform'), required_fields (array of field names), output_format ('docx', 'pdf'), formatting_rules (JSON), generation_prompt (instructions for AI), created_by (admin_id), created_at, is_active (boolean)
- **User Profile**: Represents a registered user with attributes: user_id, email (nullable for phone-only signups), password_hash (nullable for OAuth/phone signups), tenant_id, role_id (single role, assigned at signup), full_name, phone_number (nullable for email/OAuth signups), auth_method ('email', 'phone', 'google'), google_id (for OAuth users), account_status ('active', 'blocked', 'suspended'), email_verified (boolean), phone_verified (boolean), created_at, last_login
- **Document**: Represents a knowledge base document with attributes: document_id, title, content (chunked text), embedding (vector), role_id (references Role), category, metadata (type, domain_specific_attributes as JSON), images (array of image references with captions), is_scanned (boolean), ocr_confidence (0-100), status ('pending', 'approved', 'rejected', 'needs_manual_review'), uploaded_by (user_id), reviewed_by (admin_id), quality_score (0-100), is_sample_template (boolean), created_at
- **Contribution**: Represents a user-uploaded document pending review with attributes: contribution_id, document_id, uploaded_by (user_id), upload_date, ai_summary (3-5 sentences), extracted_metadata (JSON), quality_score, status, admin_notes, reviewed_at, reviewed_by (admin_id)
- **Workflow State**: Represents an in-progress document generation workflow with attributes: workflow_id, user_id, role_id, template_id (references Document Template), collected_fields (JSON), missing_fields (array), current_node, status ('in_progress', 'completed', 'abandoned'), created_at, updated_at, expires_at (24 hours from creation)
- **Generated Document**: Represents a completed document with attributes: document_id, user_id, role_id, workflow_id, template_id, document_type, file_path (.docx), metadata (domain_specific_details, citations, parameters, sample_template_used, ai_recommendations), created_at
- **Audit Log**: Represents all data access events with attributes: log_id, user_id, tenant_id, action ('query', 'upload', 'approve', 'generate', 'block_user', 'unblock_user', 'create_role', 'deactivate_role', 'create_template', 'payment', 'subscription_change'), resource_id, timestamp, ip_address, details (JSON)
- **Chat Session**: Represents a user's conversation with attributes: session_id, user_id, role_id (role context for conversation), messages (array of {role: 'user'|'assistant', content: string, timestamp: datetime, confidence_score: float, ai_model_used: string}), analysis_results (JSON: case analysis, recommendations, citations), created_at, last_active, archived (boolean, true after 30 days)
- **Query Cache**: Represents cached AI responses for cost optimization with attributes: cache_id, query_hash (SHA256 of normalized query), role_id, category, query_text, response_text, ai_model_used, confidence_score, hit_count (number of times served from cache), created_at, last_accessed, expires_at (7 days from creation)
- **Pricing History**: Represents historical pricing changes with attributes: history_id, role_id, plan_id, tier, old_price (JSON: {monthly, six_month, yearly}), new_price (JSON), old_trial_settings (JSON: {duration_days, documents_limit, queries_limit}), new_trial_settings (JSON), effective_date, changed_by (admin_id), reason (e.g., "Back to School Promotion"), created_at
- **Saved Payment Method**: Represents user's saved payment methods with attributes: payment_method_id, user_id, method_type ('card', 'jazzcash', 'easypaisa'), card_token (tokenized card, never raw number), card_last_four, card_brand, card_expiry_month, card_expiry_year, mobile_number (for JazzCash/EasyPaisa), is_default (boolean), created_at, last_used_at

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a complete domain-specific document in under 5 minutes from initial request to download (applies to any role)
- **SC-002**: System retrieves relevant documents from RAG with response time under 5 seconds for 95% of queries
- **SC-003**: Document generation (from collected fields to .docx file) completes in under 10 seconds
- **SC-004**: Admin can review and approve/reject a pending document in under 2 minutes using AI-generated summaries
- **SC-005**: Role-gated access prevents 100% of cross-domain queries (users can only access documents matching their role's category)
- **SC-006**: System scales dynamically based on load using Kubernetes auto-scaling without performance degradation (no fixed concurrent user limit)
- **SC-007**: Generated documents pass formatting validation against domain-specific standards in 100% of cases (standards defined per role)
- **SC-008**: System correctly identifies and prompts for missing required fields in 100% of document generation workflows
- **SC-009**: RAG hallucination rate is 0% (system never fabricates information not present in vector database)
- **SC-010**: User interface adapts to user's assigned role within 1 second of login, showing appropriate features and AI persona
- **SC-011**: 90% of users successfully complete their first document generation task without support intervention
- **SC-012**: System scales dynamically to handle varying concurrent user loads across web and mobile platforms without performance degradation
- **SC-013**: Users receive clear notification when approaching subscription limits (at 80% usage) with remaining quota displayed
- **SC-014**: Admin can view user list, block a user, and verify blocked user cannot log in within 2 minutes
- **SC-015**: Chat interface maintains conversation context across messages with 100% accuracy (follow-up questions reference previous context)
- **SC-016**: System displays document/chapter confirmation details and receives user confirmation before generation in 100% of workflows
- **SC-017**: Platform-wide analytics dashboard loads in under 3 seconds and displays accurate real-time metrics
- **SC-018**: Admin can create a new professional role with documents and have it fully functional within 10 minutes
- **SC-019**: System supports 20+ professional roles simultaneously without performance degradation
- **SC-020**: New role users can access only their role-specific documents with 100% isolation
- **SC-021**: Dynamic UI adapts to user's role within 1 second of login, displaying role-configured sidebar features
- **SC-022**: System successfully extracts text from scanned/image-based PDFs with minimum 90% accuracy using OCR/Vision AI
- **SC-023**: AI case/situation analysis provides success probability assessment within 30 seconds with citations to relevant precedents/rules
- **SC-024**: AI provides strategic recommendations with exact section/clause citations in 100% of policy/rule queries
- **SC-025**: Conversational AI maintains context across 10+ message turns with 95% accuracy in follow-up responses
- **SC-026**: Admin can create new document template (planner, worksheet, rubric, form) and have it functional within 5 minutes
- **SC-027**: Multi-hop reasoning queries (requiring synthesis from 3+ document sources) complete within 10 seconds
- **SC-028**: OCR processing of 200-page scanned document completes within 5 minutes with text and images extracted
- **SC-029**: Payment gateway integration completes transactions within 30 seconds with webhook confirmation
- **SC-030**: Subscription activation occurs within 5 seconds of payment confirmation
- **SC-031**: Users receive subscription expiry warnings at 30 days, 7 days, and on expiry day with 100% delivery rate
- **SC-032**: System blocks expired users from document generation/queries with 100% enforcement while preserving all data
- **SC-033**: Admin can adjust subscription pricing and changes take effect immediately for new signups
- **SC-034**: Mobile apps support biometric authentication with login completion in under 2 seconds
- **SC-035**: Mobile apps sync offline data (chat history, documents) within 5 seconds of network restoration
- **SC-036**: Mobile apps deliver push notifications for critical events with 95% delivery rate within 30 seconds
- **SC-037**: Mobile apps support camera document scanning with OCR processing completing within 10 seconds
- **SC-038**: Mobile apps handle deep links from payment gateways with 100% success rate and immediate subscription activation
- **SC-034**: Query cache hit rate reaches 40%+ for common queries (e.g., "generate 10 MCQs from Chapter 8"), reducing AI API costs by 40%
- **SC-035**: AI model routing uses cheaper models (Gemini 1.5 Flash or GPT-4o-mini) for 70% of queries and advanced models (Gemini 1.5 Pro or GPT-4o) for 30% complex queries with automatic failover
- **SC-036**: Basic tier users receive responses from cheapest models (Flash/GPT-4o-mini), Pro tier from mixed models (70% cheap, 30% advanced), Premium tier from advanced models (Pro/GPT-4o) exclusively, with automatic provider failover
- **SC-037**: Medical exam prep module provides 5000+ MCQs with detailed explanations and performance analytics
- **SC-038**: Exam prep timed tests complete with accurate timing, auto-submission, and immediate score calculation
- **SC-039**: Performance analytics display score trends, weak areas, and topic-wise breakdown within 2 seconds
- **SC-040**: System detects and prevents account sharing by flagging concurrent logins from different IPs with 95% accuracy
- **SC-041**: Docker containers start within 10 seconds and Kubernetes auto-scales pods based on CPU/memory thresholds (70% CPU triggers scale-up)
- **SC-042**: System maintains 99.5% uptime with health checks, graceful degradation, and automatic pod restarts
- **SC-043**: Database queries with RLS (Row-Level Security) complete within 100ms for 95% of requests
- **SC-044**: Redis cache hit rate for session data and query cache reaches 80%+
- **SC-045**: Total infrastructure cost remains under $200/month for 1000 active users using managed services and cost optimization strategies
- **SC-046**: Critical alerts (payment failures, API outages, security breaches) are delivered via email and Slack within 60 seconds of detection
- **SC-047**: Admin can configure alert thresholds and notification channels within 5 minutes via admin dashboard
- **SC-048**: Alert false positive rate remains below 10% (90% of alerts represent genuine issues requiring action)

### Assumptions

- Users have reliable internet connectivity for web/mobile access
- Domain-specific formatting standards remain consistent during initial development phase
- Users are proficient in English and/or Urdu for document generation
- Admin reviewers have domain expertise to validate uploaded content quality across multiple professional domains
- Document generation workflows can be paused and resumed within 24 hours (after which they expire)
- Initial knowledge base will be seeded with core documents for primary roles (legal, education, healthcare, engineering, government) before user onboarding
- Chat conversation history of 30 days is adequate for user reference needs
- Users understand their role-specific domain terminology and requirements
- Sample templates provided by users follow recognizable formatting patterns that AI can extract
- Admin-created roles will have clear, non-overlapping categories to prevent document access conflicts
- Each user has ONE role assigned at signup and cannot switch roles
- Role-specific AI personas can be defined in natural language prompts without requiring code changes
- Document formatting rules can be expressed as JSON configuration (paper size, margins, sections) without custom code
- Platform will initially support 10-15 professional roles, scaling to 50+ over time
- Payment gateways (JazzCash, EasyPaisa, Stripe for card payments) are available and reliable in Pakistan
- Stripe supports PKR currency or users are willing to pay in USD equivalent for card payments
- PCI-DSS compliance is handled by payment gateway (Stripe), not by the application directly
- Subscription pricing is competitive with market rates for professional SaaS in Pakistan
- Users are willing to pay for premium features (exam prep, advanced analytics) beyond base subscription
- Query caching with 7-day TTL provides sufficient cost savings without stale data issues
- AI model routing (cheaper models for simple queries, advanced models for complex) can be determined by query complexity heuristics
- Docker/Kubernetes infrastructure on DigitalOcean provides sufficient scalability with dynamic auto-scaling based on load (no fixed concurrent user limit)
- Managed services (PostgreSQL, Redis, Kubernetes) reduce operational overhead compared to self-managed infrastructure

### Out of Scope

- Real-time collaboration on document editing (users work individually)
- Integration with government e-filing portals for actual case submission
- Video or audio content in knowledge base (text documents only)
- On-premise deployment or self-hosted options
- Native PDF editing capabilities (only .docx generation)
- Automated legal advice or case outcome predictions (tool assists drafting only)
- Multi-language support beyond English and Urdu
- Real-time notifications or chat between users
- Multi-role per user (users can only have ONE role assigned at signup)
- Role switching after signup (role is permanent unless admin changes it)
- Cryptocurrency or international payment methods beyond card payments (Pakistan-focused payment gateways only)
- Refund processing automation (handled manually by admin)
- White-label or reseller capabilities
- API access for third-party integrations (future consideration)
- Mobile native apps (web-based responsive design for mobile browsers only)
- Offline mode or progressive web app (PWA) capabilities
- Live video consultations or telemedicine features
- E-commerce marketplace for selling documents or templates
- Social features (user profiles, following, commenting on documents)
- Gamification (badges, leaderboards, achievements) beyond exam prep performance tracking
- Manual bank transfer payments (all payments must be automated via online gateways)
