'''
Backend Unit Test
testing the process of the interview allocation and position allocation to ensure that it is work
'''
# Python Frameworl
import unittest
from unittest.mock import patch

from backend import interview_allocation, position_allocation

import os
# loads variable from a .env ---- used with Jenkins
from dotenv import load_dotenv

# Dynamical Loads the .evn file path
load_dotenv(dotenv_path=os.getenv("ENV_FILE"))

# Test Case
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
        print("")
        print("-----------------")
        print("End-to-end allocation chain test passed")
        print("-----------------")

'''
Enrty point, allowed for the program to run as a standalone file
                            or
Run test when the script is excuted directly
'''
if __name__ == "__main__":
    unittest.main()
