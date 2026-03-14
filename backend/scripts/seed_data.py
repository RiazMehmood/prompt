"""Database seed script for initial data."""
import asyncio
from datetime import datetime
from backend.src.db.supabase_client import supabase


async def seed_roles():
    """Seed initial roles."""
    print("Seeding roles...")

    lawyer_role = {
        "role_name": "lawyer",
        "display_name": "Lawyer",
        "category": "professional",
        "ai_persona_prompt": """You are a legal assistant specializing in Pakistani law.
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

Always cite specific sections and case law when applicable.""",
        "sidebar_features": [
            "chat",
            "documents",
            "case_analysis",
            "document_generation",
            "legal_research"
        ]
    }

    try:
        response = supabase.table("roles").insert(lawyer_role).execute()
        print(f"✓ Created lawyer role: {response.data[0]['role_id']}")
        return response.data[0]['role_id']
    except Exception as e:
        print(f"✗ Error creating lawyer role: {e}")
        # Try to fetch existing role
        response = supabase.table("roles").select("role_id").eq("role_name", "lawyer").execute()
        if response.data:
            print(f"✓ Using existing lawyer role: {response.data[0]['role_id']}")
            return response.data[0]['role_id']
        raise


async def seed_admin_user(role_id: str):
    """Seed root admin user."""
    print("Seeding admin user...")

    admin_user = {
        "email": "admin@example.com",
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7qXqKqKqKq",  # "admin123"
        "auth_method": "email",
        "full_name": "Root Administrator",
        "role_id": role_id,
        "account_status": "active"
    }

    try:
        response = supabase.table("users").insert(admin_user).execute()
        user_id = response.data[0]['user_id']
        print(f"✓ Created admin user: {user_id}")

        # Create admin record
        admin_record = {
            "user_id": user_id,
            "admin_type": "root",
            "permissions": {
                "manage_roles": True,
                "approve_documents": True,
                "manage_users": True,
                "view_analytics": True,
                "manage_subscriptions": True
            },
            "is_active": True
        }

        response = supabase.table("admins").insert(admin_record).execute()
        print(f"✓ Created admin record: {response.data[0]['admin_id']}")

    except Exception as e:
        print(f"✗ Error creating admin user: {e}")


async def seed_sample_documents(role_id: str):
    """Seed sample legal documents."""
    print("Seeding sample legal documents...")

    # Sample PPC sections
    ppc_sections = [
        {
            "title": "PPC Section 302 - Punishment for Murder",
            "content": """Section 302. Punishment for murder.
Whoever commits qatl-e-amd shall, subject to the provisions of this Chapter be-
(a) punished with death as qisas;
(b) punished with death or imprisonment for life as ta'zir having regard to the facts and circumstances of the case, if the proof in either of the forms specified in section 304 is not available; or
(c) punished with imprisonment of either description for a term which may extend to twenty-five years where according to the injunctions of Islam the punishment of qisas is not applicable.""",
            "category": "legal",
            "role_id": role_id,
            "status": "approved",
            "metadata": {
                "law": "PPC",
                "section": "302",
                "topic": "Murder"
            }
        },
        {
            "title": "PPC Section 420 - Cheating and Dishonestly Inducing Delivery of Property",
            "content": """Section 420. Cheating and dishonestly inducing delivery of property.
Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.""",
            "category": "legal",
            "role_id": role_id,
            "status": "approved",
            "metadata": {
                "law": "PPC",
                "section": "420",
                "topic": "Cheating"
            }
        },
        {
            "title": "PPC Section 489-F - Making or Possessing Instruments for Counterfeiting",
            "content": """Section 489-F. Making or possessing instruments or materials for forging or counterfeiting currency-notes or bank-notes.
Whoever makes or performs any part of the process of making, or buys, or sells or disposes of, or has in his possession, any machinery, instrument or material for the purpose of being used, or knowing or having reason to believe that it is intended to be used, for forging or counterfeiting any currency-note or bank-note, shall be punished with imprisonment for life, or with imprisonment of either description for a term which may extend to ten years, and shall also be liable to fine.""",
            "category": "legal",
            "role_id": role_id,
            "status": "approved",
            "metadata": {
                "law": "PPC",
                "section": "489-F",
                "topic": "Counterfeiting"
            }
        }
    ]

    # Sample CrPC sections
    crpc_sections = [
        {
            "title": "CrPC Section 497 - When Bail May Be Taken in Case of Non-Bailable Offence",
            "content": """Section 497. When bail may be taken in case of non-bailable offence.
(1) When any person accused of, or suspected of, the commission of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police-station or appears or is brought before a Court and is prepared at any time while in the custody of such officer or at any stage of the proceeding before such Court to give bail, such person may be admitted to bail:

Provided that an officer or Court admitting a person to bail under this section may impose any condition which he or it considers necessary.""",
            "category": "legal",
            "role_id": role_id,
            "status": "approved",
            "metadata": {
                "law": "CrPC",
                "section": "497",
                "topic": "Bail"
            }
        },
        {
            "title": "CrPC Section 154 - Information in Cognizable Cases",
            "content": """Section 154. Information in cognizable cases.
(1) Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it, and the substance thereof shall be entered in a book to be kept by such officer in such form as the Provincial Government may prescribe in this behalf.""",
            "category": "legal",
            "role_id": role_id,
            "status": "approved",
            "metadata": {
                "law": "CrPC",
                "section": "154",
                "topic": "FIR"
            }
        }
    ]

    all_documents = ppc_sections + crpc_sections

    try:
        for doc in all_documents:
            response = supabase.table("documents").insert(doc).execute()
            print(f"✓ Created document: {doc['title']}")
    except Exception as e:
        print(f"✗ Error creating documents: {e}")


async def main():
    """Run all seed operations."""
    print("=" * 60)
    print("Database Seeding Script - Checkpoint 1 MVP")
    print("=" * 60)

    try:
        # Seed roles
        role_id = await seed_roles()

        # Seed admin user
        await seed_admin_user(role_id)

        # Seed sample documents
        await seed_sample_documents(role_id)

        print("=" * 60)
        print("✓ Seeding completed successfully!")
        print("=" * 60)
        print("\nDefault credentials:")
        print("  Email: admin@example.com")
        print("  Password: admin123")
        print("\nNote: Change the default password after first login!")

    except Exception as e:
        print(f"\n✗ Seeding failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
