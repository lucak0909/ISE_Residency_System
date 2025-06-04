import unittest
from unittest.mock import patch
from backend import interview_allocation, position_allocation

class TestEndToEnd(unittest.TestCase):
    @patch("backend.interview_allocation.supabase")
    def test_allocation_chain(self, mock_supabase):
#       Mock the student list returned by Supabase
        mock_supabase.table().select().order().execute.return_value.data = [
            {"StudentID": "24478910", "QCA": 4.0},
            {"StudentID": "22156084", "QCA": 3.5}
        ]

#        Run dummy position allocation logic if available
#       (Replace with actual function name)
        matches = position_allocation.run_final_match()

#       Validate allocation results
        self.assertIsInstance(matches, list)
        print("End-to-end allocation chain test passed")

if __name__ == "__main__":
    unittest.main()
