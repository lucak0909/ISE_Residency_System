# Imports the unittest framework
import unittest
from unittest.mock import patch
# grabs the function from the backend interview allocation file
from backend.interview_allocation import get_sorted_students

# A test case inherited from unittest
class TestPositionAllocation(unittest.TestCase):
    # @ Patch used to mock the Supabase client
    @patch("backend.interview_allocation.supabase")
    def test_get_sorted_students(self, mock_supabase):
        # Simulates the Supabase query with some mock data
        mock_supabase.table().select().order().execute.return_value.data = [
            {"StudentID": "s123", "QCA": 3.8}
        ]
        # calls the function in the test
        students = get_sorted_students()
        # Asserted the student has the expected ID
        self.assertEqual(students[0]["StudentID"], "s123")

# if script is excuted run the unit test
if __name__ == "__main__":
    unittest.main()
