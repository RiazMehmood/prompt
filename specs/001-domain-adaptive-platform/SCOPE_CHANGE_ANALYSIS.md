# Critical Scope Change Analysis: Universal Multi-Profession Platform

**Date**: 2026-03-14
**Impact**: MAJOR - Fundamental architecture change from fixed roles to dynamic role system

## User's New Requirements

**Original Understanding**:
- Fixed roles: lawyer, magistrate, teacher, officer, admin
- 4-5 specific professional domains

**New Understanding**:
- **Universal platform for ALL professions**: account officers, executive engineers, doctors, students, research scholars, and ANY future profession
- **Admin can dynamically add new roles** with associated documents
- **Multi-tenant** supporting unlimited professional domains

## Impact Analysis

### 🔴 Critical Changes Required

#### 1. **Database Schema - MAJOR REDESIGN**

**Current (Fixed Roles)**:
```sql
-- User Profile with hardcoded roles
assigned_roles: ['lawyer', 'teacher', 'officer', 'admin']

-- Documents with fixed categories
category: 'legal' | 'education' | 'government'
```

**Required (Dynamic Roles)**:
```sql
-- New table: Roles (admin-managed)
CREATE TABLE roles (
  role_id UUID PRIMARY KEY,
  role_name TEXT UNIQUE, -- e.g., 'doctor', 'engineer', 'accountant'
  display_name TEXT, -- e.g., 'Medical Doctor', 'Executive Engineer'
  category TEXT, -- e.g., 'healthcare', 'engineering', 'finance'
  description TEXT,
  ai_persona_prompt TEXT, -- How AI should behave for this role
  sidebar_features JSONB, -- Dynamic UI features
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- User Profile with dynamic role references
CREATE TABLE user_roles (
  user_id UUID REFERENCES profiles(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

-- Documents with dynamic category references
ALTER TABLE documents ADD COLUMN role_id UUID REFERENCES roles(id);
-- category becomes dynamic based on role_id
```

#### 2. **New Admin Capabilities - HIGH PRIORITY**

**New User Story P1.5**: "Admin Creates New Professional Role"

**Acceptance Scenarios**:
1. Admin navigates to "Role Management" in admin dashboard
2. Admin clicks "Create New Role" and fills form:
   - Role Name: "executive_engineer"
   - Display Name: "Executive Engineer"
   - Category: "engineering"
   - AI Persona: "You are a technical expert in civil engineering..."
   - Sidebar Features: ["Project Plans", "Technical Specs", "Building Codes"]
3. Admin uploads initial documents for this role (building codes, standards)
4. New role becomes available for user assignment
5. Users with this role can only access engineering category documents

**New Functional Requirements**:
- **FR-030**: Admins MUST be able to create new professional roles with custom name, category, AI persona, and sidebar features
- **FR-031**: Admins MUST be able to upload initial document sets when creating a new role
- **FR-032**: System MUST dynamically generate role-specific UI (sidebar, features) based on admin-defined configuration
- **FR-033**: Admins MUST be able to deactivate roles (preventing new assignments but preserving existing user access)
- **FR-034**: System MUST support unlimited number of professional roles without code changes

#### 3. **Updated User Stories - ALL ROLES BECOME EXAMPLES**

**Current**: User Story 1 (Lawyer), User Story 3 (Teacher), etc. are specific implementations

**New Approach**: Reframe as:
- **User Story 1**: "Professional User Generates Domain-Specific Document" (generic pattern)
  - Example 1: Lawyer generates bail application
  - Example 2: Doctor generates medical report
  - Example 3: Engineer generates project specification
  - Example 4: Accountant generates financial statement

- **User Story 2**: "Admin Creates and Configures New Professional Role"
  - Admin adds "Doctor" role with healthcare category
  - Admin uploads medical protocols, pharmaceutical guidelines
  - Doctors can now access healthcare documents only

#### 4. **Constitution Updates**

**Principle VI** already updated to multi-domain, but needs emphasis on **extensibility**:

```markdown
### VI. Domain-Specific Knowledge Boundaries (EXTENSIBLE)

The platform MUST support unlimited professional domains through admin-configurable roles.
Each role has:
- Dedicated document category (role-gated RAG access)
- Domain-specific formatting standards
- Custom AI persona and terminology
- Role-specific UI features

**Core Domains (Examples)**:
- Legal, Education, Government, Engineering, Healthcare, Finance, Research

**Admin Extensibility**: Admins can add new domains without developer intervention.
```

#### 5. **Tech Stack Implications**

**Next.js Frontend**:
- Dynamic sidebar generation from role configuration
- Generic document generation UI (adapts to any role)
- Admin role management interface

**Python Backend (FastAPI)**:
- Generic agentic workflows (not hardcoded per role)
- Dynamic Pydantic model generation for role-specific fields
- Role-based RAG filtering

**Supabase (PostgreSQL)**:
- New `roles` table with RLS policies
- Dynamic role-category mapping
- Flexible metadata JSONB for role-specific attributes

## Recommended Implementation Strategy

### Phase 1: Core Dynamic Role System (Week 1-2)
1. Create `roles` table and admin role management UI
2. Migrate existing fixed roles (lawyer, teacher, officer) to dynamic roles table
3. Update RLS policies to use role_id instead of hardcoded categories
4. Test with existing 3 roles to ensure backward compatibility

### Phase 2: Generic Workflows (Week 3-4)
5. Refactor document generation workflows to be role-agnostic
6. Implement dynamic AI persona loading based on role configuration
7. Create generic UI components that adapt to role features
8. Test by adding 2 new roles (doctor, engineer) through admin interface

### Phase 3: Full Extensibility (Week 5-6)
9. Add admin capability to define custom document templates per role
10. Implement dynamic sidebar feature configuration
11. Add role-specific usage limits and analytics
12. Production testing with 5+ diverse professional roles

## Updated Success Criteria

- **SC-018**: Admin can create a new professional role with documents and have it fully functional within 10 minutes
- **SC-019**: System supports 20+ professional roles simultaneously without performance degradation
- **SC-020**: New role users can access only their role-specific documents with 100% isolation
- **SC-021**: Dynamic UI adapts to new roles within 1 second of role selection

## Risks & Mitigation

**Risk 1**: Complexity explosion with unlimited roles
- **Mitigation**: Enforce role templates and validation rules

**Risk 2**: Admin misconfiguration breaking user experience
- **Mitigation**: Role preview mode before activation, validation checks

**Risk 3**: Performance degradation with many roles
- **Mitigation**: Indexed role_id queries, caching role configurations

## Next Steps

1. ✅ Update constitution Principle VI (DONE)
2. ⏳ Update spec.md with dynamic role system (IN PROGRESS)
3. ⏳ Add new user story: "Admin Creates New Professional Role"
4. ⏳ Add FR-030 to FR-034 for role management
5. ⏳ Update all entities to support dynamic roles
6. ⏳ Create database migration plan document

**Estimated Impact**:
- Spec updates: 2-3 hours
- Constitution updates: 30 minutes (mostly done)
- Planning phase: +1 week (architecture redesign)
- Implementation: +3 weeks (dynamic system vs fixed roles)

**Recommendation**: This is the RIGHT architecture for a scalable multi-profession SaaS. The upfront complexity pays off with unlimited extensibility.
