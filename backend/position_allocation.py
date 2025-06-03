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

def get_interview_pairs():
    if supabase is None:
        return []
    result = supabase.table("InterviewAllocated").select("StudentID", "CompanyID").execute()
    return result.data

def get_student_rank(student_id, company_id):
    if supabase is None:
        return []
    result = supabase.table("StudentInterviewRank")\
        .select("Rank")\
        .eq("StudentID", student_id)\
        .eq("CompanyID", company_id)\
        .execute()
    return result.data[0]["Rank"] if result.data else None

def get_company_rank(company_id, student_id):
    if supabase is None:
        return []
    result = supabase.table("CompanyInterviewRank")\
        .select("Rank")\
        .eq("ComoanyID", company_id)\
        .eq("StudentID", student_id)\
        .execute()
    return result.data[0]["Rank"] if result.data else None

def get_student_qca(student_id):
    if supabase is None:
        return []
    result = supabase.table("Student").select("QCA").eq("StudentID", student_id).execute()
    return float(result.data[0]["QCA"]) if result.data else None

def get_company_position(company_id):
    if supabase is None:
        return []
    result = supabase.table("Position").select("PositionID").eq("CompanyID", company_id).limit(1).execute()
    return result.data[0]["PositionID"] if result.data else None

def run_final_match():
    if supabase is None:
        return []
    interview_pairs = get_interview_pairs()
    matches = []

    for pair in interview_pairs:
        student_id = pair["StudentID"]
        company_id = pair["CompanyID"]

        s_rank = get_student_rank(student_id, company_id)
        c_rank = get_company_rank(company_id, student_id)

        if s_rank is not None and c_rank is not None:
            combined_score = s_rank + c_rank
            qca = get_student_qca(student_id)
            position_id = get_company_position(company_id)

            matches.append({
                "StudentID": student_id,
                "CompanyID": company_id,
                "PositionID": position_id,
                "CombinedScore": combined_score,
                "QCA": qca
            })

    #Sort: lowest combined score, then highest QCA
    matches.sort(key=lambda m: (m["CombinedScore"], -m["QCA"]))

    assigned_students = set()
    assigned_companies = set()
    final_matches = []

    for match in matches:
        sid = match["StudentID"]
        cid = match["CompanyID"]
        pid = match["PositionID"]

        if sid not in assigned_students and pid not in assigned_companies:
            #Allocate
            final_matches.append(match)
            assigned_students.add(sid)
            assigned_companies.add(pid)

            #Insert into FinalMatches table
            supabase.table("FinalMatches").insert({
                "StudentID": sid,
                "CompanyID": cid,
                "PositionID": pid,
                "CombinedScore": match["CombinedScore"]
            }).execute()

    return final_matches

def get_company_rankings():
    if supabase is None:
        print("Supabase is not initialized. Returning empty company rankings.")
        return []
    result = supabase.table("CompanyRank").select("*").execute()
    return result.data

def get_student_rankings():
    if supabase is None:
        print("Supabase is not initialized. Returning empty student rankings.")
        return []
    result = supabase.table("StudentRank2").select("*").execute()
    return result.data

def allocate_positions():
    # Implementation of position allocation algorithm
    # This is a placeholder - you'll need to implement the actual algorithm
    if supabase is None:
        print("Cannot allocate positions: Supabase client not initialized")
        return {}

    print("Starting position allocation process...")

    # Get company and student rankings
    company_rankings = get_company_rankings()
    student_rankings = get_student_rankings()

    # Clear any existing allocations
    supabase.table("PositionAllocated").delete().neq("StudentID", 0).execute()

    # Your allocation algorithm here
    # ...

    # Return the allocations
    return {"status": "Position allocation completed"}

if __name__ == "__main__":
    if supabase:
        result = allocate_positions()
        print(result)
    else:
        print("Cannot allocate positions: Supabase client not initialized")
