# Critical Feature Additions - Advanced AI Capabilities

**Date**: 2026-03-14
**Impact**: HIGH - Adds strategic AI guidance, OCR/Vision, and conversational intelligence

## New Requirements from User Scenarios

### 1. **Teacher - Expanded Document Types**

**Current**: Only MCQ generation
**New Requirements**:
- Planners (lesson plans, semester planners, daily schedules)
- Worksheets (practice exercises, homework assignments)
- Rubrics (grading criteria, assessment matrices)
- Tests (full test papers with multiple question types)
- Question papers (board exam format, chapter-wise tests)

**Impact**: Need generic document type system, not hardcoded workflows

### 2. **Lawyer - AI Case Strategy & Success Analysis**

**Current**: Only document generation (bail applications)
**New Requirements**:
- **Case Discussion**: Conversational AI that understands case details
- **Success Probability**: AI analyzes case facts against precedents and suggests likelihood of success
- **Strategy Suggestions**: AI recommends legal strategies based on similar cases
- **Section Recommendations**: AI suggests relevant PPC/CrPC sections to cite
- **Filing Guidance**: Step-by-step guidance on how to file the case

**Impact**: Need advanced RAG with reasoning capabilities, not just retrieval

### 3. **Town Officer - Complex Policy Queries with Context**

**Scenario**: Employee worked July-Dec in one office, now in different office. Needs ACR (Annual Confidential Report). Question: "Does he need to go to previous office or can current office write ACR?"

**Requirements**:
- **Contextual Understanding**: AI understands multi-office, time-period scenarios
- **Policy Search**: RAG searches government service rules, ACR policies
- **Section Citations**: AI shows exact sections/clauses from official documents
- **Clear Guidance**: Step-by-step answer with rule references

**Impact**: Need advanced query understanding and multi-document reasoning

### 4. **OCR/Vision AI - Image-Based Documents**

**Current**: Only text-based PDFs supported
**New Requirement**: "Many books have pictures not words"

**Examples**:
- Scanned textbooks (images of pages)
- Engineering drawings/blueprints
- Medical diagrams/charts
- Handwritten notes
- Government forms with stamps/signatures

**Impact**: Need OCR + Vision AI model integration

### 5. **Executive Engineer - Situation Analysis & Recommendations**

**Scenario**: "Project is 6 months late, what to do?"

**Requirements**:
- **Situation Analysis**: AI understands project delay context
- **Rule-Based Recommendations**: AI searches engineering policies for late completion procedures
- **Document Generation**: AI creates required applications (late completion request, extension application)
- **Compliance Guidance**: AI shows which forms/approvals needed

**Impact**: Need reasoning AI that connects situations to rules to actions

### 6. **Conversational AI with Strategic Guidance** (All Roles)

**Current**: Simple query-response
**New Requirement**: AI acts as domain expert advisor

**Capabilities Needed**:
- Multi-turn conversations with context
- "What if" scenario analysis
- Probability/risk assessment
- Strategic recommendations
- Step-by-step guidance
- Proactive suggestions

**Impact**: Need advanced LLM with reasoning, not just RAG retrieval

---

## Technical Implications

### 1. **OCR/Vision AI Integration**

**Options**:
- **Google Cloud Vision API** (free tier: 1000 requests/month)
- **Tesseract OCR** (open source, self-hosted)
- **Gemini 1.5 Pro with Vision** (multimodal, can see images)
- **GPT-4 Vision** (expensive, not free-tier)

**Recommended**: **Gemini 1.5 Flash with Vision** (free tier, multimodal)
- Can process images directly
- Extract text from scanned pages
- Understand diagrams/charts
- Free tier: 15 RPM, 1M tokens/day

**Architecture**:
```python
# Document upload flow
if file.type == 'pdf':
    if is_scanned_pdf(file):  # Check if image-based
        # Use Gemini Vision to extract text
        text = gemini_vision.extract_text(file)
        images = gemini_vision.extract_images(file)
    else:
        # Use PyPDF2 for text-based PDFs
        text = extract_text_from_pdf(file)
else:
    raise ValueError("Only PDF supported")

# Store both text and image references
document.content = text
document.images = images  # For visual reference
```

### 2. **Advanced RAG with Reasoning**

**Current**: Simple vector similarity search
**New Requirement**: Multi-hop reasoning, context understanding

**Architecture**:
```python
# Lawyer case analysis workflow
class CaseAnalysisAgent:
    def analyze_case(self, case_details):
        # Step 1: Extract key facts
        facts = self.extract_facts(case_details)

        # Step 2: Find similar cases (RAG)
        similar_cases = self.rag_search(facts, category='legal')

        # Step 3: Analyze success patterns
        success_rate = self.analyze_precedents(similar_cases)

        # Step 4: Generate strategy
        strategy = self.generate_strategy(facts, similar_cases)

        # Step 5: Recommend sections
        sections = self.recommend_sections(facts, strategy)

        return {
            'success_probability': success_rate,
            'strategy': strategy,
            'relevant_sections': sections,
            'similar_cases': similar_cases
        }
```

**LangGraph Workflow**:
```
User Query → Extract Facts → RAG Search → Reasoning → Strategy Generation → Response
     ↓                                        ↓
Context Memory ←──────────────────────────────┘
```

### 3. **Generic Document Type System**

**Current**: Hardcoded workflows (bail_application, mcq_generation)
**New**: Template-based system

**Architecture**:
```python
# Document templates stored in database
class DocumentTemplate:
    template_id: UUID
    role_id: UUID
    template_name: str  # "planner", "worksheet", "rubric"
    template_type: str  # "structured", "freeform"
    required_fields: List[str]  # ["subject", "grade", "topic"]
    output_format: str  # "docx", "pdf"
    formatting_rules: JSON
    generation_prompt: str  # How to generate this document type

# Generic workflow
def generate_document(template_id, user_inputs):
    template = get_template(template_id)

    # Collect required fields
    fields = collect_fields(template.required_fields, user_inputs)

    # RAG search for relevant content
    context = rag_search(fields, role_id=template.role_id)

    # Generate using template prompt
    content = llm.generate(
        prompt=template.generation_prompt,
        context=context,
        fields=fields
    )

    # Format according to rules
    document = format_document(content, template.formatting_rules)

    return document
```

### 4. **Conversational AI with Memory**

**Architecture**:
```python
# Chat session with persistent memory
class ConversationalAgent:
    def __init__(self, session_id, role_id):
        self.session = get_chat_session(session_id)
        self.role = get_role(role_id)
        self.memory = self.session.messages  # Full conversation history

    def respond(self, user_message):
        # Add to memory
        self.memory.append({'role': 'user', 'content': user_message})

        # Determine intent
        intent = self.classify_intent(user_message)

        if intent == 'case_analysis':
            response = self.analyze_case(user_message, self.memory)
        elif intent == 'policy_query':
            response = self.search_policy(user_message, self.memory)
        elif intent == 'document_generation':
            response = self.generate_document(user_message, self.memory)
        else:
            response = self.general_query(user_message, self.memory)

        # Add to memory
        self.memory.append({'role': 'assistant', 'content': response})

        # Persist
        self.session.save()

        return response
```

---

## Updated Functional Requirements

**New FRs to Add**:

- **FR-036**: System MUST support OCR and vision AI to extract text from scanned/image-based PDF documents
- **FR-037**: System MUST provide AI-powered case analysis for lawyers including success probability assessment based on precedents
- **FR-038**: System MUST offer strategic guidance and recommendations based on domain-specific rules and policies
- **FR-039**: System MUST support generic document template system where admins can define new document types without code changes
- **FR-040**: System MUST maintain conversation context across multiple turns and provide contextual follow-up responses
- **FR-041**: System MUST perform multi-hop reasoning to answer complex queries requiring information from multiple documents
- **FR-042**: System MUST cite exact sections/clauses from source documents when providing guidance
- **FR-043**: System MUST support "what-if" scenario analysis for professional decision-making
- **FR-044**: Teachers MUST be able to generate planners, worksheets, rubrics, tests, and question papers (not just MCQs)
- **FR-045**: System MUST extract and store images from documents for visual reference alongside text content

---

## Updated Success Criteria

**New SCs to Add**:

- **SC-022**: System successfully extracts text from scanned/image-based PDFs with 95% accuracy using OCR/Vision AI
- **SC-023**: Lawyer case analysis provides success probability assessment within 30 seconds with citations to relevant precedents
- **SC-024**: AI provides strategic recommendations with exact section/clause citations in 100% of policy queries
- **SC-025**: Conversational AI maintains context across 10+ message turns with 95% accuracy
- **SC-026**: Admin can create new document template (planner, worksheet, rubric) and have it functional within 5 minutes
- **SC-027**: Multi-hop reasoning queries (requiring 3+ document sources) complete within 10 seconds

---

## Updated User Stories

**New User Stories to Add**:

### User Story 11 - Lawyer Analyzes Case Strategy (Priority: P1)

A lawyer has a client charged under Section 302 PPC (murder). The lawyer opens chat and describes the case: "Client was present at scene but claims self-defense. Two eyewitnesses, one favorable. What are chances of bail?" The AI analyzes similar cases from the database, finds precedents where bail was granted in self-defense claims, calculates success probability (65% based on 20 similar cases), and recommends strategy: "File bail under Section 497 CrPC citing self-defense. Emphasize favorable witness. Cite Mst. Safia Bibi vs State (2018) where bail granted in similar circumstances." The lawyer can then ask follow-ups: "What if prosecution has forensic evidence?" and AI adjusts analysis.

### User Story 12 - Town Officer Resolves ACR Query (Priority: P3)

A town officer receives query from employee: "I worked July-Dec in Office A, now in Office B. Who writes my ACR?" Officer asks the app: "Employee worked 6 months in previous office, now transferred. ACR responsibility?" AI searches government service rules, finds relevant sections, and responds: "According to Punjab Civil Servants Act 1974, Section 15(3): ACR for period July-Dec must be written by Office A (where employee served). Current Office B writes ACR only for period after transfer. Employee must request Office A to complete ACR for July-Dec period. Reference: Establishment Division Notification No. 4/2/2010 dated 15-03-2010." Officer can then ask: "What if Office A refuses?" and AI provides escalation procedure.

### User Story 13 - Teacher Creates Worksheet from Scanned Textbook (Priority: P4)

A teacher uploads a scanned Punjab Board Science textbook (image-based PDF). The AI uses vision capabilities to extract text and diagrams from Chapter 3: Chemical Reactions. Teacher asks: "Create worksheet with 5 fill-in-the-blank questions and 3 diagram labeling exercises from this chapter." AI extracts relevant content, identifies diagrams, generates worksheet with questions and includes diagram images for labeling. Teacher downloads formatted worksheet ready for printing.

### User Story 14 - Executive Engineer Handles Project Delay (Priority: P5)

An executive engineer's road construction project is 6 months behind schedule. Engineer asks: "Project delayed 6 months due to land acquisition issues. What applications do I need to file?" AI searches NHA (National Highway Authority) policies, finds late completion procedures, and responds: "You need to file: 1) Time Extension Application (Form NHA-TE-01) citing land acquisition delay, 2) Revised Project Completion Certificate, 3) Delay Justification Report. According to NHA Manual Section 8.4.2, land acquisition delays are valid grounds for extension. I can generate these documents for you." Engineer confirms, and AI generates all three documents with proper formatting and required fields pre-filled.

---

## Recommended LLM Upgrade

**Current**: Gemini 1.5 Flash (text only)
**Recommended**: **Gemini 1.5 Flash with Vision** (multimodal)

**Why**:
- Same free tier (15 RPM, 1M tokens/day)
- Supports text + images
- Can process scanned documents
- Can understand diagrams/charts
- No additional cost

**Alternative**: Keep Gemini Flash for text, add Google Cloud Vision API for OCR (1000 free requests/month)

---

## Implementation Priority

1. **Phase 1** (Week 1-2): OCR/Vision integration for scanned documents
2. **Phase 2** (Week 3-4): Generic document template system
3. **Phase 3** (Week 5-6): Advanced RAG with reasoning (case analysis, policy queries)
4. **Phase 4** (Week 7-8): Conversational AI with multi-turn context

---

**Next Step**: Update spec.md with these new features and requirements.
