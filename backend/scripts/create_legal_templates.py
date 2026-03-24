"""
create_legal_templates.py
=========================
Deletes all existing Legal-domain templates from the DB, then inserts 12
comprehensive Pakistani court document templates for the Thatta Session Court
knowledge base.

Run from backend/ with the project venv active:
    python scripts/create_legal_templates.py
"""

import os
import sys
import json
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.supabase_client import get_supabase_admin

LEGAL_DOMAIN_ID = "00000000-0000-0000-0000-000000000001"

# ---------------------------------------------------------------------------
# Shared formatting rules for all Pakistani court documents
# ---------------------------------------------------------------------------
COURT_FORMATTING = {
    "paper_size": "Legal",
    "paper_width_in": 8.5,
    "paper_height_in": 14,
    "margins": {
        "top_in": 1.0,
        "bottom_in": 1.0,
        "left_in": 1.5,
        "right_in": 1.0,
    },
    "font_family": "Times New Roman",
    "font_size_pt": 12,
    "heading_font_size_pt": 14,
    "line_spacing": 1.5,
    "para_spacing_after_pt": 6,
    "heading_style": "centered_bold_uppercase",
    "party_block_style": "centered_with_ellipsis",
    "para_numbering": "arabic",
    "signature_alignment": "right",
    "language": "english",
    "urdu_allowed": False,
}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Template definitions
# ---------------------------------------------------------------------------

# 1. Bail Application
BAIL_APPLICATION = {
    "id": _id(),
    "name": "Bail Application",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Pre-arrest or post-arrest bail application under Section 497/498 Cr.P.C for Pakistani courts.",
    "content": """\
IN THE COURT OF {{court_name}}
{{bail_type}} APPLICATION NO. _____ OF {{case_year}}

{{accused_name}} s/o {{accused_father_name}}, b/c {{accused_caste}},
{{accused_religion}}, r/o {{accused_address}} ..................... Accused/Applicant

V E R S U S

The State ............................................................. Respondent


{{bail_type}} APPLICATION U/S {{bail_section}} Cr.P.C

FIR No: {{fir_number}} dated {{fir_date}}, PS: {{police_station}}, u/s {{sections}}

The applicant named above most respectfully submits as under:

1.    That the applicant has been implicated in the above mentioned FIR No.{{fir_number}} dated {{fir_date}}, registered at PS {{police_station}} u/s {{sections}}.

2.    That {{case_facts}}

3.    That the alleged offence is bailable/the applicant is entitled to bail on the following grounds:

{{bail_grounds}}

4.    That the applicant has deep roots in the society and there is no likelihood of his/her fleeing from justice.

5.    That the applicant undertakes to abide by all the conditions that may be imposed by this Honourable Court.

{{previous_bail_history}}

PRAYER:
It is, therefore, most respectfully prayed that bail/pre-arrest bail may kindly be granted to the applicant on such surety as this Honourable Court deems fit and proper, in the interest of justice.

Thatta
Dated: {{application_date}}                    {{lawyer_name}}
                                               Advocate
                                               {{bar_council}}
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Sessions Judge Thatta",
        },
        {
            "name": "bail_type",
            "label": "Bail Type",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Bail", "Pre-Arrest Bail"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "bail_section",
            "label": "Section Cr.P.C",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["497", "498", "497/498"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "auto",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_name",
            "label": "Accused Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_father_name",
            "label": "Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_address",
            "label": "Accused Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "fir_number",
            "label": "FIR Number",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "fir_date",
            "label": "FIR Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "police_station",
            "label": "Police Station",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "sections",
            "label": "Sections (PPC/CNSA etc.)",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "302/34 PPC",
        },
        {
            "name": "case_facts",
            "label": "Brief Facts of Case",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "bail_grounds",
            "label": "Grounds for Bail",
            "type": "textarea",
            "required": True,
            "data_source": "rag_retrieval",
            "rag_query_hint": "bail grounds arguments precedents for sections {{sections}} PPC",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "previous_bail_history",
            "label": "Previous Bail Applications History",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "surety_amount",
            "label": "Surety Amount Proposed",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Application Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "lawyer_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "bar_council",
            "label": "Bar Council Registration",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 2. Vakalatnama
VAKALATNAMA = {
    "id": _id(),
    "name": "Vakalatnama",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Standard Vakalatnama (power of attorney for court proceedings) authorising an advocate to appear on behalf of a client.",
    "content": """\
VAKALATNAMA

IN THE COURT OF {{court_name}}

{{case_type}} No. _____ of {{case_year}}

{{client_name}} s/o {{client_father_name}}, b/c {{client_caste}},
{{client_religion}}, r/o {{client_address}} ................... {{client_role}}

                    V E R S U S

{{opposing_party_name}} .............................................. {{opposing_party_role}}

I/We {{client_name}} the above named {{client_role}} do hereby appoint {{advocate_name}} Advocate(s) to appear, act on my/our behalf and plead as my/our advocate in the above matter.

I/We also authorize my/our advocate to compromise, refer matter to arbitration, receive money due and/or to withdraw the above matter.

Dated: {{execution_date}}                          Signature of Client


Received by me on ___________

Accepted:

{{advocate_name}}
{{advocate_registration}}
{{advocate_address}}
Cell: {{advocate_cell}}
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "case_type",
            "label": "Case Type",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": [
                "Suit",
                "Criminal Case",
                "Civil Appeal",
                "Criminal Appeal",
                "Misc. Application",
                "Rent Application",
                "Family Suit",
                "Revenue Appeal",
            ],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_name",
            "label": "Client Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_father_name",
            "label": "Client Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_address",
            "label": "Client Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_role",
            "label": "Client's Role",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": [
                "Complainant",
                "Plaintiff",
                "Appellant",
                "Applicant",
                "Accused",
                "Defendant",
                "Respondent",
                "Opponent",
            ],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "opposing_party_name",
            "label": "Opposing Party Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "opposing_party_role",
            "label": "Opposing Party Role",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": [
                "Accused",
                "Defendant",
                "Respondent",
                "Opponent",
                "Complainant",
                "Plaintiff",
                "Appellant",
            ],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_registration",
            "label": "Bar Registration No.",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "advocate_address",
            "label": "Advocate Office Address",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_cell",
            "label": "Advocate Cell No.",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "execution_date",
            "label": "Date of Execution",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "authorize_compromise",
            "label": "Authorize Compromise",
            "type": "select",
            "required": False,
            "data_source": "user_input",
            "options": ["Yes", "No"],
            "enabled": False,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 3. Legal Notice
LEGAL_NOTICE = {
    "id": _id(),
    "name": "Legal Notice",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Formal legal notice issued by an advocate on behalf of a client demanding action before initiating court proceedings.",
    "content": """\
{{advocate_name}}
{{advocate_qualification}}
{{advocate_office_address}}
Cell: {{advocate_cell}}


Through {{delivery_method}}


Ref: {{ref_number}}                    Dated: {{notice_date}}

From:     {{advocate_name}}
          Advocate

On behalf of:    {{client_name}}
                 r/o {{client_address}}

To,
{{recipient_name}}
{{recipient_designation}}
{{recipient_address}}


Subject:  Legal Notice

Under the instructions of my above named client, I serve you with this legal notice as under:

{{facts_grounds}}

You are therefore hereby called upon to {{demand}} within {{compliance_period}} days of receipt of this notice, failing which my client shall be constrained to initiate legal proceedings against you in the competent court of law at your own risk and cost.

{{legal_action_warning}}

({{advocate_name}})
Advocate
Ref.No. {{bar_registration}}
""",
    "slot_definitions": [
        {
            "name": "advocate_name",
            "label": "Advocate/Sender Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_qualification",
            "label": "Qualification (e.g. M.A, LL.B)",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "advocate_office_address",
            "label": "Office Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_cell",
            "label": "Cell Number",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "delivery_method",
            "label": "Delivery Method",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Courier Service", "Registered Post", "Speed Post", "Hand Delivery"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "ref_number",
            "label": "Reference Number",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "notice_date",
            "label": "Notice Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_name",
            "label": "Client Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "client_address",
            "label": "Client Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "recipient_name",
            "label": "Recipient Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "recipient_designation",
            "label": "Recipient Designation",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "recipient_address",
            "label": "Recipient Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered paragraphs)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "demand",
            "label": "Demand / Action Required",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "compliance_period",
            "label": "Compliance Period (Days)",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["7", "10", "14", "30"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_action_warning",
            "label": "Legal Provisions & Consequences",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "legal notice consequences legal action provisions Pakistan",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "bar_registration",
            "label": "Bar Registration No.",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 4. Succession Certificate
SUCCESSION_CERTIFICATE = {
    "id": _id(),
    "name": "Succession Certificate Application",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Application under Section 372 of the Succession Act 1925 for issuance of succession certificate to claim deceased's service emoluments and assets.",
    "content": """\
IN THE COURT OF {{court_name}}
S.M.A No. _____ of {{case_year}}

{{applicant_name}} s/o {{applicant_father_name}}, b/c {{applicant_caste}},
{{applicant_religion}}, r/o {{applicant_address}} ............... Applicant

                    V E R S U S

{{legal_heirs_parties}}
Public at Large ......................................................... Respondents


APPLICATION U/S 372 OF THE SUCCESSION ACT, 1925

The Applicant named above begs to submit as under:

1.    That the applicant is {{applicant_relationship}} of deceased {{deceased_name}} s/o {{deceased_father_name}}.

2.    That deceased {{deceased_name}} died on {{date_of_death}} at {{place_of_death}}, leaving the applicant and respondents as legal heirs. {{death_certificate_note}}

3.    That said deceased {{deceased_name}} {{deceased_occupation_details}}

4.    That after the death of said deceased, the following service emoluments/assets have not been released to the legal heirs:
{{service_benefits}}

5.    That the concerned authorities have required a Succession Certificate for release of above said emoluments, hence this application.

6.    That despite diligent search, no will of the deceased has been found.

{{additional_grounds}}

PRAYER:
The Applicant therefore prays that Succession Certificate may kindly be granted to the applicant in respect of {{service_benefits_prayer}}, enabling the applicant to receive said amounts. {{family_pension_prayer}}

{{legal_grounds}}

Thatta
Dated: {{application_date}}                    {{advocate_name}}
                                               Advocate for Applicant

VERIFICATION
I, {{applicant_name}}, do hereby verify on solemn affirmation that whatever stated above is true and correct to the best of my knowledge and belief.

Thatta
Dated: {{application_date}}                              DEPONENT
Identified by me,
Advocate
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "District Judge Thatta",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_name",
            "label": "Applicant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_father_name",
            "label": "Applicant Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_address",
            "label": "Applicant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_relationship",
            "label": "Relationship to Deceased",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "son/daughter/wife",
        },
        {
            "name": "deceased_name",
            "label": "Deceased Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "deceased_father_name",
            "label": "Deceased Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "deceased_caste",
            "label": "Deceased Caste",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "date_of_death",
            "label": "Date of Death",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "place_of_death",
            "label": "Place of Death",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "death_certificate_note",
            "label": "Death Certificate Reference",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "deceased_occupation_details",
            "label": "Deceased Occupation/Service Details",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "deceased_employer",
            "label": "Employer/Department Name",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "service_benefits",
            "label": "Assets/Benefits Sought",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "GP Fund, Group Insurance, Benevolent Fund, Bank amount etc.",
        },
        {
            "name": "service_benefits_prayer",
            "label": "Prayer — Benefits/Assets",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_heirs_parties",
            "label": "Legal Heirs (names + relationship, for respondents list)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "family_pension_prayer",
            "label": "Family Pension Prayer",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "additional_grounds",
            "label": "Additional Grounds",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Application Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_grounds",
            "label": "Relevant Legal Grounds (Succession Act)",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "succession certificate application grounds Succession Act 1925 Pakistan",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 5. Illegal Dispossession Application
ILLEGAL_DISPOSSESSION = {
    "id": _id(),
    "name": "Illegal Dispossession Application",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Private complaint under the Illegal Dispossession Act 2005 (Sections 3, 4 r/w 8) seeking restoration of illegally seized property.",
    "content": """\
IN THE COURT OF {{court_name}}
Private Complaint No. _____ of {{case_year}}

{{complainant_name}} s/o {{complainant_father_name}}, b/c {{complainant_caste}},
{{complainant_religion}}, r/o {{complainant_address}} ........... Complainant

                    V E R S U S

{{accused_names}} .................................................... Accused


APPLICATION U/S 3, 4 R/W SECTION 8 OF THE ILLEGAL DISPOSSESSION ACT 2005

It is prayed on behalf of the complainant that this Honourable Court may be pleased to grant the relief of restoring the possession of {{property_description}} to the complainant, on the following facts and grounds:

{{facts_grounds}}

PRAYER:
(a) That this Honourable Court may be pleased to take cognizance under the Illegal Dispossession Act 2005 and direct the accused to restore possession of {{property_description}} to the complainant and punish the accused u/s 3(2) of Illegal Dispossession Act 2005.

(b) That this Honourable Court may be pleased to grant interim relief u/s 7 of Illegal Dispossession Act directing the accused to restore the complainant in possession till final decision.

{{interim_relief}}

(c) Any other relief which this Honourable Court deems fit and proper be awarded to Complainant.

{{legal_grounds}}

Thatta
Dated: {{application_date}}                    {{advocate_name}}
                                               Advocate for Complainant

Enclosures:
{{annexures}}

Names of Witnesses:
{{witnesses}}
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Sessions Judge Thatta",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_name",
            "label": "Complainant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_father_name",
            "label": "Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_address",
            "label": "Complainant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_names",
            "label": "Accused Name(s) & Addresses",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "property_description",
            "label": "Property Description",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Residential plot admeasuring 25x30 sq.ft situated at...",
        },
        {
            "name": "dispossession_date",
            "label": "Date of Illegal Dispossession",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "purchase_price",
            "label": "Purchase Price of Property",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "interim_relief",
            "label": "Additional Interim Relief Details",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "annexures",
            "label": "List of Enclosures/Annexures",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "witnesses",
            "label": "Names & Addresses of Witnesses",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Application Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_grounds",
            "label": "Relevant Legal Grounds (IDA 2005)",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "illegal dispossession act 2005 section 3 4 8 grounds application Pakistan",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 6. Direct Criminal Complaint
DIRECT_CRIMINAL_COMPLAINT = {
    "id": _id(),
    "name": "Direct Criminal Complaint",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Direct complaint filed before a Judicial Magistrate under relevant PPC sections where police have failed to act.",
    "content": """\
IN THE COURT OF {{court_name}}
Direct Complaint No. _____ of {{case_year}}

{{complainant_name}} s/o {{complainant_father_name}}, b/c {{complainant_caste}},
{{complainant_religion}}, r/o {{complainant_address}} ........... Complainant

                    V E R S U S

{{accused_names}} .................................................... Accused


COMPLAINT U/S {{ppc_sections}}

The complainant named above respectfully submits as under:

{{facts_grounds}}

The complainant has no hope that police would do justice with him/her and seeing no other way, the complainant knocks the door of this Honourable Court and prays that the accused persons may be dealt with in accordance with law, be prosecuted and penalized, and justice may kindly be done with the complainant.

{{legal_provisions}}

Thatta
Dated: {{application_date}}                              COMPLAINANT

{{advocate_name}}
Advocate for Complainant

NAMES OF WITNESSES:
{{witnesses}}
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Judicial Magistrate-II Thatta",
        },
        {
            "name": "magistrate_type",
            "label": "Magistrate Type",
            "type": "select",
            "required": False,
            "data_source": "user_input",
            "options": [
                "Judicial Magistrate-I",
                "Judicial Magistrate-II",
                "First Class Magistrate",
                "Sessions Judge",
            ],
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_name",
            "label": "Complainant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_father_name",
            "label": "Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "complainant_address",
            "label": "Complainant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_names",
            "label": "Accused Name(s), Address(es)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "ppc_sections",
            "label": "Sections (PPC/Other)",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "302/34 PPC or 494/493-A PPC",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered paragraphs)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "nikkahnama_reference",
            "label": "Nikkahnama/Marriage Reference",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "witnesses",
            "label": "Names of Witnesses",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Complaint Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name (if represented)",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "legal_provisions",
            "label": "Relevant PPC Sections & Provisions",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "criminal complaint direct complaint PPC sections law Pakistan provisions",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 7. Revenue Appeal
REVENUE_APPEAL = {
    "id": _id(),
    "name": "Revenue Appeal (Sindh Land Revenue Act)",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Appeal before a revenue court under the Sindh Land Revenue Act 1967 against orders of subordinate revenue officers regarding agricultural land entries.",
    "content": """\
BEFORE THE {{court_name}}
Revenue Appeal No. _____ of {{case_year}}

{{appellant_name}} s/o {{appellant_father_name}}, b/c {{appellant_caste}},
{{appellant_religion}}, r/o {{appellant_address}} ............... Appellant

                    V E R S U S

{{respondents}} .................................................. Respondents


APPEAL U/S {{appeal_section}} OF THE SINDH LAND REVENUE ACT, 1967

It is prayed on behalf of the appellant that this Honourable Court may be pleased to {{prayer}}, on the following facts and grounds:

FACTS

{{facts_grounds}}

Land Details:
Deh: {{deh_name}}    Tapo: {{tapo_name}}    Survey Nos: {{survey_numbers}}
Area: {{land_area}}    Entry No: {{entry_number}}

{{legal_grounds}}

PRAYER
The appellant therefore prays that {{prayer}} in the interest of justice.

Thatta
Dated: {{application_date}}                    {{advocate_name}}
                                               Advocate for Appellant

Documents filed:
{{documents_filed}}
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Revenue Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Additional Deputy Commissioner-I Thatta",
        },
        {
            "name": "appeal_section",
            "label": "Section of Sindh Land Revenue Act",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "161",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "appellant_name",
            "label": "Appellant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "appellant_father_name",
            "label": "Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "appellant_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "appellant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "appellant_address",
            "label": "Appellant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "respondents",
            "label": "Respondents (AC, Mukhtiarkar, Tapedar etc.)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "deh_name",
            "label": "Deh (Village/Area)",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "tapo_name",
            "label": "Tapo Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "survey_numbers",
            "label": "Survey Numbers",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "land_area",
            "label": "Land Area / Share",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "entry_number",
            "label": "Entry Number (Deh Form VII)",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "prayer",
            "label": "Prayer / Relief Sought",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "documents_filed",
            "label": "List of Documents Filed",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Date of Appeal",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_grounds",
            "label": "Relevant Legal Grounds (Land Revenue Act)",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "revenue appeal Sindh Land Revenue Act 1967 section 161 grounds",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 8. Family Court Application
FAMILY_COURT_APPLICATION = {
    "id": _id(),
    "name": "Family Court Application",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Application before a Family Court under the West Pakistan Family Courts Act for maintenance, dower recovery, child custody, or dissolution of marriage.",
    "content": """\
IN THE COURT OF {{court_name}}
Family {{case_type}} No. _____ of {{case_year}}

{{plaintiff_name}} d/o/w/o {{plaintiff_father_name}},
{{plaintiff_religion}}, r/o {{plaintiff_address}} ............... Plaintiff

                    V E R S U S

{{defendant_name}} .................................................. Defendant


{{application_type}} APPLICATION

{{case_type_heading}}

It is prayed on behalf of the Plaintiff that this Honourable Court may be pleased to {{relief_sought}}, on the grounds mentioned in the accompanying affidavit and herein below:

{{facts_grounds}}

{{maintenance_details}}
{{dower_details}}
{{custody_details}}

{{legal_grounds}}

PRAYER:
{{prayer}}

The prayer is made in the interest of justice.

Thatta
Dated: {{application_date}}                    {{advocate_name}}
                                               Advocate for Plaintiff

AFFIDAVIT

I, {{plaintiff_name}}, do hereby state on solemn affirmation that the accompanying application has been moved on my instructions, contents of which are true and correct to the best of my knowledge and belief.

Thatta
Dated: {{application_date}}                              DEPONENT
Identified by me,
Advocate
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Family Judge Thatta",
        },
        {
            "name": "case_type",
            "label": "Family Suit / Appeal",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Suit", "Appeal"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "plaintiff_name",
            "label": "Plaintiff Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "plaintiff_father_name",
            "label": "Father's / Husband's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "plaintiff_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "plaintiff_address",
            "label": "Plaintiff Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "plaintiff_role",
            "label": "Plaintiff Role",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Wife", "Husband", "Mother", "Father", "Guardian"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "defendant_name",
            "label": "Defendant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "application_type",
            "label": "Application Type",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": [
                "Maintenance",
                "Dower Recovery",
                "Child Custody",
                "Dissolution of Marriage",
                "Restitution of Conjugal Rights",
                "Urgency",
                "Recovery of Past Maintenance",
            ],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "case_type_heading",
            "label": "Application Sub-Heading",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "relief_sought",
            "label": "Relief Sought",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "prayer",
            "label": "Prayer",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "maintenance_details",
            "label": "Maintenance Details (amount/period)",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "dower_details",
            "label": "Dower/Mehr Details",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "custody_details",
            "label": "Child Custody Details",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "witnesses",
            "label": "Witnesses",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Application Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_grounds",
            "label": "Relevant Family Law Provisions",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "family court application grounds West Pakistan Family Courts Act maintenance dower custody",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 9. Rent Matter Application
RENT_MATTER_APPLICATION = {
    "id": _id(),
    "name": "Rent Matter Application",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Application before the Rent Controller/Senior Civil Judge under the Sindh Rented Premises Ordinance for eviction, rent recovery, or restoration of possession.",
    "content": """\
IN THE COURT OF {{court_name}}
Rent Application No. _____ of {{case_year}}

{{applicant_name}} s/o {{applicant_father_name}},
{{applicant_religion}}, r/o {{applicant_address}} ............... Applicant

                    V E R S U S

{{opponent_name}} ................................................... Opponent


APPLICATION UNDER SECTION {{application_section}}

{{application_type}}

It is prayed on behalf of the Applicant that this Honourable Court may be pleased to {{relief_sought}}, on consideration of the following facts and grounds:

{{facts_grounds}}

Premises Description: {{premises_description}}
Monthly Rent: Rs. {{monthly_rent}}    Tenancy Since: {{tenancy_start_date}}

{{eviction_grounds}}

PRAYER:
{{prayer}}

The prayer is made in the interest of justice and equity.

Thatta
Dated: {{application_date}}                    {{advocate_name}}
                                               Advocate for Applicant

AFFIDAVIT

I, {{applicant_name}}, do hereby state on solemn affirmation that whatever stated above is true and correct.

Thatta
Dated: {{application_date}}                              DEPONENT
Identified by me,
Advocate
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Senior Civil Judge/Rent Controller Thatta",
        },
        {
            "name": "application_section",
            "label": "Section",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "151 CPC",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_name",
            "label": "Applicant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_father_name",
            "label": "Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_address",
            "label": "Applicant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "opponent_name",
            "label": "Opponent/Tenant Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "application_type",
            "label": "Application Type",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": [
                "Eviction",
                "Rent Enhancement",
                "Recovery of Arrears",
                "Restoration of Possession",
                "Site Inspection",
            ],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "relief_sought",
            "label": "Relief Sought",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "premises_description",
            "label": "Premises Description & Location",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "monthly_rent",
            "label": "Monthly Rent (Rs.)",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "tenancy_start_date",
            "label": "Tenancy Start Date",
            "type": "date",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "rent_arrears",
            "label": "Rent Arrears Amount",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "prayer",
            "label": "Prayer",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Application Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "eviction_grounds",
            "label": "Relevant Rent Law Provisions",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "rent matter eviction landlord tenant Sindh Rented Premises Ordinance grounds",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 10. Free Will Declaration
FREE_WILL_DECLARATION = {
    "id": _id(),
    "name": "Free Will Declaration (Marriage)",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Sworn declaration before an Oath Commissioner affirming that a person is entering into marriage entirely of their own free will without coercion.",
    "content": """\
FREE WILL DECLARATION

I, {{declarant_name}} {{declarant_gender_title}} {{declarant_father_name}},
{{declarant_religion}}, b/c {{declarant_caste}},
r/o {{declarant_address}},

do hereby declare on solemn affirmation that:

1.    That I am {{declarant_age}} years old adult {{declarant_religion}} {{declarant_gender}} and am of sound mind and health.

2.    That my marital status is {{marital_status}}. {{previous_marriage_details}}

3.    That I have decided of my own free will and without any coercion, pressure, or undue influence of any person to marry {{proposed_spouse_name}} {{proposed_spouse_title}} {{proposed_spouse_father_name}}, {{proposed_spouse_religion}}, r/o {{proposed_spouse_address}}.

4.    That no one has forced or pressured me to make this declaration and the said Nikkah/marriage is of my own free choice.

5.    That whoever objects to or obstructs my said marriage shall be responsible for the consequences.

{{additional_declarations}}

Thatta
Dated: {{declaration_date}}                              DECLARANT

Identified by me,
{{oath_commissioner_name}}
Oath Commissioner

WITNESSES:
{{witnesses}}
""",
    "slot_definitions": [
        {
            "name": "declarant_name",
            "label": "Declarant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_gender",
            "label": "Gender",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Male", "Female"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_gender_title",
            "label": "Title (s/o, d/o, w/o)",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["s/o", "d/o", "w/o"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_father_name",
            "label": "Father's / Husband's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Non-Muslim"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_address",
            "label": "Declarant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "declarant_age",
            "label": "Age",
            "type": "number",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "marital_status",
            "label": "Marital Status",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Unmarried", "Divorced", "Widowed", "Previously Married"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "previous_marriage_details",
            "label": "Previous Marriage Details (if divorced/widowed)",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "divorce_date",
            "label": "Divorce Date",
            "type": "date",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "proposed_spouse_name",
            "label": "Proposed Spouse Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "proposed_spouse_title",
            "label": "Spouse Title",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["s/o", "d/o"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "proposed_spouse_father_name",
            "label": "Proposed Spouse Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "proposed_spouse_religion",
            "label": "Proposed Spouse Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "proposed_spouse_address",
            "label": "Proposed Spouse Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "additional_declarations",
            "label": "Additional Declarations",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "oath_commissioner_name",
            "label": "Oath Commissioner Name",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "declaration_date",
            "label": "Date of Declaration",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "witnesses",
            "label": "Witnesses Names & Addresses",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 11. Special Power of Attorney
SPECIAL_POWER_OF_ATTORNEY = {
    "id": _id(),
    "name": "Special Power of Attorney",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Special Power of Attorney authorising an attorney-in-fact to act on behalf of the grantor in specified legal, property, or court matters.",
    "content": """\
SPECIAL POWER OF ATTORNEY

I, {{grantor_name}} {{grantor_title}} {{grantor_father_name}},
{{grantor_religion}}, b/c {{grantor_caste}},
Adult, r/o {{grantor_address}},

do hereby appoint and constitute {{attorney_name}} {{attorney_title}} {{attorney_father_name}},
r/o {{attorney_address}},

as my true and lawful Attorney to do the following acts and things on my behalf:

{{powers_granted}}

in respect of the following matter:

{{matter_description}}

{{property_description}}

I hereby declare that all acts, deeds and things done by my said Attorney shall be binding on me to the same extent as if done by me personally.

{{court_authority}}

{{additional_clauses}}

Thatta
Dated: {{grant_date}}

                                               ({{grantor_name}})
                                               GRANTOR / EXECUTOR

Witness 1: ___________________
Witness 2: ___________________

Signed before me / Attested by:
{{oath_commissioner}}
{{notary_details}}
""",
    "slot_definitions": [
        {
            "name": "grantor_name",
            "label": "Grantor Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "grantor_title",
            "label": "Grantor Title",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["s/o", "d/o", "w/o"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "grantor_father_name",
            "label": "Grantor Father's / Husband's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "grantor_religion",
            "label": "Grantor Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "grantor_caste",
            "label": "Caste/Biradri",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "grantor_address",
            "label": "Grantor Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "attorney_name",
            "label": "Attorney Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "attorney_title",
            "label": "Attorney Title",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["s/o", "d/o", "w/o"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "attorney_father_name",
            "label": "Attorney Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "attorney_address",
            "label": "Attorney Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "powers_granted",
            "label": "Specific Powers Granted",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "1. To appear before courts\n2. To sign documents\n3. To collect money...",
        },
        {
            "name": "matter_description",
            "label": "Matter / Subject Description",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "property_description",
            "label": "Property Description (if property related)",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "court_authority",
            "label": "Court / Case Authority (if court related)",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "additional_clauses",
            "label": "Additional Clauses",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "grant_date",
            "label": "Date of Grant",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "witnesses",
            "label": "Witnesses Details",
            "type": "textarea",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "oath_commissioner",
            "label": "Oath Commissioner / Notary Name",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
        {
            "name": "notary_details",
            "label": "Notary Registration Details",
            "type": "text",
            "required": False,
            "data_source": "user_input",
            "enabled": False,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}

# 12. Application u/s 22-A Cr.P.C
APPLICATION_22A = {
    "id": _id(),
    "name": "Application u/s 22-A Cr.P.C (FIR Registration)",
    "domain_id": LEGAL_DOMAIN_ID,
    "description": "Application before a Judicial Magistrate under Section 22-A(6)(i) Cr.P.C directing the SHO to register an FIR after police refusal or inaction.",
    "content": """\
IN THE COURT OF {{court_name}}
Criminal Misc. Application No. _____ of {{case_year}}

{{applicant_name}} s/o {{applicant_father_name}},
{{applicant_religion}}, r/o {{applicant_address}} ............... Applicant / Complainant

                    V E R S U S

The Station House Officer,
Police Station {{police_station}},
District Thatta .................................................... Respondent No. 1

{{accused_names}} ................................................... Accused / Respondents


APPLICATION UNDER SECTION 22-A(6)(i) Cr.P.C

The applicant named above respectfully submits as under:

1.    That the applicant submitted a complaint / FIR application against the above named accused at Police Station {{police_station}} on {{complaint_date}} u/s {{ppc_sections}} but the Incharge/SHO refused/failed to register the same.

2.    {{police_refusal_reason}}

3.    That the acts of the accused constitute cognizable offences u/s {{ppc_sections}}.

{{facts_grounds}}

{{legal_provisions}}

PRAYER:
It is most respectfully prayed that this Honourable Court may be pleased to direct the SHO/Incharge PS {{police_station}} to register the FIR against the accused u/s {{ppc_sections}} in the interest of justice.

Thatta
Dated: {{application_date}}                    {{advocate_name}}
                                               Advocate for Applicant
""",
    "slot_definitions": [
        {
            "name": "court_name",
            "label": "Court Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "Judicial Magistrate First Class Thatta",
        },
        {
            "name": "case_year",
            "label": "Year",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_name",
            "label": "Applicant Full Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_father_name",
            "label": "Father's Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_religion",
            "label": "Religion",
            "type": "select",
            "required": True,
            "data_source": "user_input",
            "options": ["Muslim", "Hindu", "Christian", "Other"],
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "applicant_address",
            "label": "Applicant Address",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "police_station",
            "label": "Police Station Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "accused_names",
            "label": "Accused Name(s) & Addresses",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "ppc_sections",
            "label": "Sections (PPC/Other)",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "302/34 PPC",
        },
        {
            "name": "complaint_date",
            "label": "Date Complaint Filed at Police",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "police_refusal_reason",
            "label": "Reason for Police Refusal / Inaction",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "facts_grounds",
            "label": "Facts & Grounds (numbered)",
            "type": "textarea",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "application_date",
            "label": "Application Date",
            "type": "date",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "advocate_name",
            "label": "Advocate Name",
            "type": "text",
            "required": True,
            "data_source": "user_input",
            "enabled": True,
            "placeholder": "",
        },
        {
            "name": "legal_provisions",
            "label": "Relevant Provisions & Precedents",
            "type": "textarea",
            "required": False,
            "data_source": "rag_retrieval",
            "rag_query_hint": "22-A Cr.P.C application FIR registration magistrate direction grounds Pakistan",
            "enabled": True,
            "placeholder": "",
        },
    ],
    "formatting_rules": COURT_FORMATTING,
    "version": "1.0",
    "is_active": True,
}


# ---------------------------------------------------------------------------
# All templates list
# ---------------------------------------------------------------------------
ALL_TEMPLATES = [
    BAIL_APPLICATION,
    VAKALATNAMA,
    LEGAL_NOTICE,
    SUCCESSION_CERTIFICATE,
    ILLEGAL_DISPOSSESSION,
    DIRECT_CRIMINAL_COMPLAINT,
    REVENUE_APPEAL,
    FAMILY_COURT_APPLICATION,
    RENT_MATTER_APPLICATION,
    FREE_WILL_DECLARATION,
    SPECIAL_POWER_OF_ATTORNEY,
    APPLICATION_22A,
]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
BAIL_APP_OLD_ID = "00000000-0000-0000-0001-000000000001"


def main() -> None:
    db = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Update Bail Application in-place (has FK refs, can't delete)
    #         Insert all other templates fresh.
    # ------------------------------------------------------------------

    # Separate the bail application from the rest
    bail_tpl   = next((t for t in ALL_TEMPLATES if t["name"] == "Bail Application"), None)
    other_tpls = [t for t in ALL_TEMPLATES if t["name"] != "Bail Application"]

    # 1a. Update Bail Application (keep old ID)
    if bail_tpl:
        update_payload = {k: v for k, v in bail_tpl.items() if k != "id"}
        db.table("templates").update(update_payload).eq("id", BAIL_APP_OLD_ID).execute()
        print(f"✓ Updated: Bail Application  (id={BAIL_APP_OLD_ID})")

    # 1b. Delete non-referenced Legal templates (all except bail app)
    existing = db.table("templates").select("id,name").eq("domain_id", LEGAL_DOMAIN_ID).neq("id", BAIL_APP_OLD_ID).execute().data or []
    for row in existing:
        refs = db.table("generated_documents").select("id").eq("template_id", row["id"]).execute().data or []
        if not refs:
            db.table("templates").delete().eq("id", row["id"]).execute()
            print(f"  Removed old: {row['name']}")

    # 1c. Insert the 11 new templates
    if other_tpls:
        insert_result = db.table("templates").insert(other_tpls).execute()
        inserted = insert_result.data or []
    else:
        inserted = []

    print(f"\n✓ Inserted {len(inserted)} new template(s):\n")
    for i, t in enumerate(inserted, 1):
        slot_count = len(t.get("slot_definitions") or [])
        rag_slots  = sum(1 for s in (t.get("slot_definitions") or []) if s.get("data_source") == "rag_retrieval")
        print(f"  {i:2d}. {t['name']}  [{slot_count} slots, {rag_slots} RAG]  id={t['id']}")

    total = 1 + len(inserted)
    print(f"\nDone. {total} Legal domain templates active in DB.")


if __name__ == "__main__":
    main()
