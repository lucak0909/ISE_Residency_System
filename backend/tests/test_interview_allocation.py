'''
Backend Unit Test
Test to ensure that the interview allocation proccess is functional
'''
# Python's built in unit testing
import unittest
from unittest.mock import patch
# Function being tested
from backend.interview_allocation import get_sorted_students

# Test case for student sorting logic
class TestInterviewAllocation(unittest.TestCase):
#   Patch the supabase client used inside "interview_allocation"
    @patch("backend.interview_allocation.supabase")
    def test_sorted_students_ordered_by_qca_desc(self, mock_supabase):
        '''
        Ensure students returned by get_sorted_students() are ordered by QCA descending.
        '''
        mock_supabase.table().select().order().execute.return_value.data = [
            {"StudentID": "s1", "QCA": 3.8},
            {"StudentID": "s2", "QCA": 3.2},
            {"StudentID": "s3", "QCA": 2.5},
        ]

#       Confirm result is sorted in descending order
        students = get_sorted_students()
        qcas = [s["QCA"] for s in students]

        self.assertEqual(qcas, sorted(qcas, reverse=True))
        print("")
        print("-----------------")
        print("Students sorted correctly by QCA")
        print("-----------------")

if __name__ == "__main__":
    unittest.main()