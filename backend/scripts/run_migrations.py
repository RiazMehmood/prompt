"""Run Supabase migrations automatically."""
import os
from supabase import create_client, Client

# Set environment variables
SUPABASE_URL = "https://ypxflnyritmmhszqfebr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweGZsbnlyaXRtbWhzenFmZWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDUwMDksImV4cCI6MjA4OTA4MTAwOX0.WLSpgLVPNK45L8nrcTfXjR9sQPRom82AbQDm27KzkxQ"

print("=" * 60)
print("Running Supabase Migrations")
print("=" * 60)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read migration files
migrations_dir = "/home/riaz/Desktop/prompt/backend/supabase/migrations"

migrations = [
    "20260314_create_core_tables.sql",
    "20260314_create_subscriptions_table.sql",
    "20260314_create_documents_chat_tables.sql",
    "20260315_create_rls_policies.sql"
]

for migration_file in migrations:
    print(f"\n📄 Running: {migration_file}")

    file_path = os.path.join(migrations_dir, migration_file)

    with open(file_path, 'r') as f:
        sql = f.read()

    try:
        # Execute SQL via Supabase RPC
        # Note: Supabase Python client doesn't support raw SQL execution
        # We need to use the REST API directly
        print(f"   ⚠️  Cannot execute via Python client - needs manual run in Supabase dashboard")
        print(f"   📋 File location: {file_path}")
    except Exception as e:
        print(f"   ✗ Error: {e}")

print("\n" + "=" * 60)
print("Migration Status")
print("=" * 60)
print("\n⚠️  Supabase Python client doesn't support raw SQL execution.")
print("Please run migrations manually in Supabase SQL Editor:")
print("\n1. Go to: https://supabase.com/dashboard/project/ypxflnyritmmhszqfebr/sql")
print("2. Click 'New Query'")
print("3. Copy and paste each migration file:")
print(f"   - {migrations_dir}/20260314_create_core_tables.sql")
print(f"   - {migrations_dir}/20260314_create_subscriptions_table.sql")
print(f"   - {migrations_dir}/20260314_create_documents_chat_tables.sql")
print(f"   - {migrations_dir}/20260315_create_rls_policies.sql")
print("4. Run each query")
print("\nAlternatively, I can provide you with a single combined SQL file to run.")
