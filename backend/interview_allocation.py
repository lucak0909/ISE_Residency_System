import os
from dotenv import load_dotenv
from supabase import create_client

# Load .env from project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

# Use dummy values only if .env fails
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nmmnypaivavlxxjpbdlr.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "dummy_key")

# Debug
print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY is set:", bool(SUPABASE_KEY))

# Initialize Supabase client once
supabase = None
if SUPABASE_URL and SUPABASE_KEY and "dummy" not in SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("⚠️ Supabase client not initialized — running in test mode or dummy key")

import h2

# load_dotenv()

def get_sorted_students():
    if supabase is None:
        print("⚠️ Supabase is not initialized. Returning empty student list.")
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
    students = get_sorted_students()
    allocation_counts = get_company_allocation_counts()
    student_allocations = {}

    for student in students:
        student_id = student["StudentID"]
        preferences = get_student_rankings(student_id)
        allocated = 0
        student_allocations[student_id] = []

        for pref in preferences:
            company_id = pref["CompanyID"]
            if allocation_counts.get(company_id, 0) < 3:
                #Allocate
                supabase.table("InterviewAllocated").insert({
                    "StudentID": student_id,
                    "CompanyID": company_id
                }).execute()

                allocation_counts[company_id] = allocation_counts.get(company_id, 0) + 1
                student_allocations[student_id].append(company_id)
                allocated += 1

            if allocated >= 3:
                break

    return student_allocations


if __name__ == "__main__":
    allocations = allocate_interviews()
    for sid, companies in allocations.items():
        print(f"Student {sid} allocated to companies: {companies}")

