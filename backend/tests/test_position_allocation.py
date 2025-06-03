import unittest
from unittest.mock import patch
from backend.interview_allocation import get_sorted_students

class TestPositionAllocation(unittest.TestCase):

    @patch("backend.interview_allocation.supabase")
    def test_get_sorted_students(self, mock_supabase):
        mock_supabase.table().select().order().execute.return_value.data = [
            {"StudentID": "s123", "QCA": 3.8}
        ]
        students = get_sorted_students()
        self.assertEqual(students[0]["StudentID"], "s123")

if __name__ == "__main__":
    unittest.main()
