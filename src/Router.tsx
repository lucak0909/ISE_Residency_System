import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login             from './pages/AuthPage';
import JobsBoard         from './pages/JobsBoard';
import StudentDashboard  from './pages/S_Dashboard';
import StudentRanking1   from './pages/S_Ranking1';
import StudentRanking2   from './pages/S_Ranking2';
import PartnerDashboard  from './pages/P_Dashboard';
import PartnerRanking    from './pages/P_Ranking';

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                {/* public */}
                <Route path="/Login" element={<Login />} />
                <Route path="/JobsBoard" element={<JobsBoard/>}/>

                {/* student area */}
                <Route path="/StudentDashboard" element={<StudentDashboard />} />
                <Route path="/StudentRanking1"  element={<StudentRanking1  />} />
                <Route path="/StudentRanking2"  element={<StudentRanking2  />} />

                {/* partner area */}
                <Route path="/PartnerDashboard" element={<PartnerDashboard />} />
                <Route path="/PartnerRanking"  element={<PartnerRanking  />} />

                {/* shortcuts / fall-backs */}
                <Route path="/"         element={<Navigate to="/Login" />} />
                <Route path="*"         element={<Navigate to="/Login" />} />
            </Routes>
        </BrowserRouter>
    );
}
