from dotenv import load_dotenv
from supabase import create_client
import os
import h2

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_sorted_students():
    result = supabase.table("Student").select("StudentID, QCA").order("QCA", desc=True).execute()
    return result.data

def get_student_rankings(student_id):
    result = supabase.table("StudentRank1")\
        .select("CompanyID, Rank")\
        .eq("StudentID", student_id)\
        .order("Rank", desc=False)\
        .execute()
    return result.data

def get_company_allocation_counts():
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

