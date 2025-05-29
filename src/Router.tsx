import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login             from './pages/App';            // your current login form
import StudentDashboard  from './pages/S_Dashboard';
import StudentRanking1   from './pages/S_Ranking1';
import StudentRanking2   from './pages/S_Ranking2';     // create later

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                {/* public */}
                <Route path="/login" element={<Login />} />

                {/* student area */}
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/ranking1"  element={<StudentRanking1  />} />
                <Route path="/ranking2"  element={<StudentRanking2  />} />

                {/* shortcuts / fall-backs */}
                <Route path="/"         element={<Navigate to="/dashboard" />} />
                <Route path="*"         element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
}
