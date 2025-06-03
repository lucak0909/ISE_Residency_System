import os
from dotenv import load_dotenv
from supabase import create_client

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dummy.supabase.io")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "dummy_key")

# Debug
print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY is set:", bool(SUPABASE_KEY))

supabase = None
if SUPABASE_URL and SUPABASE_KEY and "dummy" not in SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("Supabase client not initialized — running in test mode or dummy key")

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
        .eq("CompanyID", company_id)\
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

            matches.append({
                "StudentID": student_id,
                "CompanyID": company_id,
                "CombinedScore": combined_score,
                "QCA": qca
            })

    # Sort: lowest combined score, then highest QCA
    matches.sort(key=lambda m: (m["CombinedScore"], -m["QCA"]))

    assigned_students = set()
    company_assignments = {}  # company_id: number of assigned students
    final_matches = []

    for match in matches:
        sid = match["StudentID"]
        cid = match["CompanyID"]

        if sid not in assigned_students and company_assignments.get(cid, 0) < 2:
            final_matches.append(match)
            assigned_students.add(sid)
            company_assignments[cid] = company_assignments.get(cid, 0) + 1

            # Insert into FinalMatches table
            supabase.table("FinalMatches").insert({
                "StudentID": sid,
                "CompanyID": cid,
                "CombinedScore": match["CombinedScore"]
            }).execute()

    return final_matches


if __name__ == "__main__":
    final = run_final_match()
    for match in final:
        print(f"Student {match['StudentID']} matched with Company {match['CompanyID']} (Score : {match['CombinedScore']})")

