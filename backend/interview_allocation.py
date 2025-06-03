import os
import re
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env file
backend_env = os.path.join(os.path.dirname(__file__), '.env')
project_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Try to load from backend directory first, then project root
if os.path.exists(backend_env):
    load_dotenv(dotenv_path=backend_env)
    print(f"Loaded .env from {backend_env}")
elif os.path.exists(project_env):
    load_dotenv(dotenv_path=project_env)
    print(f"Loaded .env from {project_env}")
else:
    print("No .env file found")

# Get Supabase credentials from environment variables with VITE_ prefix
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

# Remove quotes if present (sometimes .env parsers keep the quotes)
if SUPABASE_URL and SUPABASE_URL.startswith('"') and SUPABASE_URL.endswith('"'):
    SUPABASE_URL = SUPABASE_URL[1:-1]
if SUPABASE_KEY and SUPABASE_KEY.startswith('"') and SUPABASE_KEY.endswith('"'):
    SUPABASE_KEY = SUPABASE_KEY[1:-1]

# Debug output
print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY is set:", bool(SUPABASE_KEY))
print("SUPABASE_KEY first 10 chars:", SUPABASE_KEY[:10] + "..." if SUPABASE_KEY else "None")

# Initialize Supabase client
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully")
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
else:
    print("Supabase client not initialized — URL or key missing")

# Helper functions
def get_sorted_students():
    if supabase is None:
        print("Supabase is not initialized. Returning empty student list.")
        return []
    result = supabase.table("Student").select("StudentID, QCA").order("QCA", desc=True).execute()
    return result.data

def get_student_rankings(student_id):
    if supabase is None:
        return []
    result = supabase.table("StudentRank1") \
        .select("CompanyID, Rank") \
        .eq("StudentID", student_id) \
        .order("Rank", desc=False) \
        .execute()
    return result.data

def get_company_allocation_counts():
    if supabase is None:
        return {}
    result = supabase.table("InterviewAllocated").select("CompanyID, count:StudentID", count="exact").execute()
    allocation_counts = {}
    for record in result.data:
        company_id = record['CompanyID']
        allocation_counts[company_id] = allocation_counts.get(company_id, 0) + 1
    return allocation_counts

def allocate_interviews():
    # Get students sorted by QCA (highest first)
    students = get_sorted_students()

    # Start with empty allocation counts
    allocation_counts = {}
    student_allocations = {}

    # Clear any existing allocations to start fresh
    supabase.table("InterviewAllocated").delete().neq("StudentID", 0).execute()

    # Process students in strict QCA order
    for student in students:
        student_id = student["StudentID"]
        preferences = get_student_rankings(student_id)

        # Diagnostic: Check if student has preferences
        if not preferences:
            print(f"Student {student_id} has no preferences in StudentRank1 table")
            student_allocations[student_id] = []
            continue

        allocated = 0
        student_allocations[student_id] = []

        # Try to allocate based on preferences in ranked order
        for pref in preferences:
            company_id = pref["CompanyID"]
            current_count = allocation_counts.get(company_id, 0)

            if current_count < 3:
                # Allocate
                supabase.table("InterviewAllocated").insert({
                    "StudentID": student_id,
                    "CompanyID": company_id
                }).execute()

                allocation_counts[company_id] = current_count + 1
                student_allocations[student_id].append(company_id)
                allocated += 1

                if allocated >= 3:
                    break

        # Report allocation results for this student
        if allocated == 0:
            print(f"Student {student_id} could not be allocated to any companies - all preferences at capacity")
        elif allocated < 3:
            print(f"Student {student_id} only allocated to {allocated} companies - not enough available preferences")
        else:
            print(f"Student {student_id} successfully allocated to {allocated} companies")

    return student_allocations

if __name__ == "__main__":
    if supabase:
        allocations = allocate_interviews()
        for sid, companies in allocations.items():
            print(f"Student {sid} allocated to companies: {companies}")
    else:
        print("Cannot allocate interviews: Supabase client not initialized")