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
    """Get all student-company pairs that were allocated for interviews"""
    if supabase is None:
        return []
    result = supabase.table("InterviewAllocated").select("StudentID", "CompanyID").execute()
    return result.data

def get_student_rank(student_id, company_id):
    """Get a student's ranking of a company after interviews"""
    if supabase is None:
        return None
    result = supabase.table("StudentInterviewRank")\
        .select("Rank")\
        .eq("StudentID", student_id)\
        .eq("CompanyID", company_id)\
        .execute()
    return result.data[0]["Rank"] if result.data else None

def get_company_rank(company_id, student_id):
    """Get a company's ranking of a student after interviews"""
    if supabase is None:
        return None
    result = supabase.table("CompanyInterviewRank")\
        .select("Rank")\
        .eq("CompanyID", company_id)\
        .eq("StudentID", student_id)\
        .execute()
    return result.data[0]["Rank"] if result.data else None

def get_student_qca(student_id):
    """Get a student's QCA"""
    if supabase is None:
        return None
    result = supabase.table("Student").select("QCA").eq("StudentID", student_id).execute()
    return float(result.data[0]["QCA"]) if result.data and result.data[0]["QCA"] else None

def get_company_positions_count(company_id):
    """Get the number of positions available at a company"""
    if supabase is None:
        return 0

    # For now, let's assume each company has 2 positions available
    # You can modify this to fetch the actual number from a database table if needed
    return 2

def run_final_match():
    """Run the final matching algorithm to allocate students to companies"""
    if supabase is None:
        print("Supabase client not initialized. Cannot run matching algorithm.")
        return []

    print("Starting final matching process...")

    # Clear any existing final matches
    try:
        supabase.table("FinalMatches").delete().neq("StudentID", 0).execute()
        print("Cleared existing final matches")
    except Exception as e:
        print(f"Error clearing existing matches: {e}")

    # Get all interview pairs
    interview_pairs = get_interview_pairs()
    print(f"Found {len(interview_pairs)} interview pairs")

    # Get company position counts (how many students each company can take)
    company_positions = {}
    for pair in interview_pairs:
        company_id = pair["CompanyID"]
        if company_id not in company_positions:
            company_positions[company_id] = get_company_positions_count(company_id)

    print(f"Companies with positions: {len(company_positions)}")

    matches = []

    # Calculate combined scores for each student-company pair
    for pair in interview_pairs:
        student_id = pair["StudentID"]
        company_id = pair["CompanyID"]

        # Get rankings from both sides
        s_rank = get_student_rank(student_id, company_id)
        c_rank = get_company_rank(company_id, student_id)

        # Only consider pairs where both have ranked each other
        if s_rank is not None and c_rank is not None:
            combined_score = s_rank + c_rank
            qca = get_student_qca(student_id)

            matches.append({
                "StudentID": student_id,
                "CompanyID": company_id,
                "CombinedScore": combined_score,
                "QCA": qca
            })

    print(f"Calculated scores for {len(matches)} valid pairs")

    # Sort by lowest combined score (best match), then highest QCA
    matches.sort(key=lambda m: (m["CombinedScore"], -m["QCA"] if m["QCA"] is not None else 0))

    # Allocate students to companies (allowing multiple students per company)
    assigned_students = set()
    company_allocations = {cid: 0 for cid in company_positions}
    final_matches = []

    for match in matches:
        sid = match["StudentID"]
        cid = match["CompanyID"]

        # Only allocate if:
        # 1. Student hasn't been assigned yet
        # 2. Company still has positions available
        if sid not in assigned_students and company_allocations[cid] < company_positions[cid]:
            # Allocate
            final_matches.append(match)
            assigned_students.add(sid)
            company_allocations[cid] += 1

            # Insert into FinalMatches table
            try:
                supabase.table("FinalMatches").insert({
                    "StudentID": sid,
                    "CompanyID": cid,
                    "CombinedScore": match["CombinedScore"]
                }).execute()
                print(f"Matched Student {sid} with Company {cid} (Score: {match['CombinedScore']}) - Position {company_allocations[cid]}/{company_positions[cid]}")
            except Exception as e:
                print(f"Error inserting match: {e}")

    print(f"Final allocation: {len(final_matches)} students matched with companies")

    # Print allocation stats
    print("\nCompany allocation stats:")
    for cid, allocated in company_allocations.items():
        if allocated > 0:
            company_result = supabase.table("Company").select("CompanyName").eq("CompanyID", cid).execute()
            company_name = company_result.data[0]['CompanyName'] if company_result.data else f"Company {cid}"
            print(f"{company_name}: {allocated}/{company_positions[cid]} positions filled")

    return final_matches

if __name__ == "__main__":
    if supabase:
        final = run_final_match()
        print("\nFinal Matching Results:")
        print(f"Total matches: {len(final)}")

        # Get student names for better output
        for match in final:
            student_id = match['StudentID']
            company_id = match['CompanyID']

            # Get student name
            student_result = supabase.table("User").select("FirstName", "Surname").eq("ID", student_id).execute()
            student_name = f"{student_result.data[0]['FirstName']} {student_result.data[0]['Surname']}" if student_result.data else f"Student {student_id}"

            # Get company name
            company_result = supabase.table("Company").select("CompanyName").eq("CompanyID", company_id).execute()
            company_name = company_result.data[0]['CompanyName'] if company_result.data else f"Company {company_id}"

            print(f"{student_name} matched with {company_name} (Score: {match['CombinedScore']})")
    else:
        print("Cannot run final match: Supabase client not initialized")