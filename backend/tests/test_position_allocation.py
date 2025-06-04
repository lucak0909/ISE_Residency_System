# Python's built in unit testing
import unittest
from unittest.mock import patch
# Function being tested
from backend.interview_allocation import get_sorted_students

# Test case for student sorting logic
class TestPositionAllocation(unittest.TestCase):
#   Patch the supabase client used inside "interview_allocation"
    @patch("backend.interview_allocation.supabase")
    def test_get_sorted_students(self, mock_supabase):
#       Mock response return from Supabase
        mock_supabase.table().select().order().execute.return_value.data = [
            {"StudentID": "24123456", "QCA": 3.8}
        ]

#       Call the function
        students = get_sorted_students()

#       Validation that returned value is a list within the expected strucutre
        self.assertIsInstance(students, list)
        self.assertEqual(len(students), 1)
        self.assertEqual(students[0]["StudentID"], "24123456")
        self.assertEqual(students[0]["QCA"], 3.8)

#       Comfirmation that test worked
        print("Supabase student allocation logic passed")

#Run test when the script is excuted directly
if __name__ == "__main__":
    unittest.main()

