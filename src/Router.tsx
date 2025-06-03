import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login             from './pages/App';
import JobsBoard         from './pages/JobsBoard';

import StudentDashboard  from './pages/S_Dashboard';
import StudentRanking1   from './pages/S_Ranking1';
import StudentRanking2   from './pages/S_Ranking2';

import PartnerDashboard  from './pages/P_Dashboard';
import PartnerRanking    from './pages/P_Ranking';

//import AdminDashboard  from './pages/A_Dashboard.tsx';
//import AdminDatabase    from './pages/A_Database.tsx';

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                {/* public */}
                <Route path="/login" element={<Login />} />
                <Route path="/JobsBoard" element={<JobsBoard/>}/>

                {/* student area */}
                <Route path="/StudentDashboard" element={<StudentDashboard />} />
                <Route path="/StudentRanking1"  element={<StudentRanking1  />} />
                <Route path="/StudentRanking2"  element={<StudentRanking2  />} />

                {/* partner area */}
                <Route path="/PartnerDashboard" element={<PartnerDashboard />} />
                <Route path="/PartnerRanking"  element={<PartnerRanking  />} />

                {/* admin area */}
                {/*
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                <Route path="/AdminDatabase"  element={<AdminDatabase  />} />
                */}

                {/* shortcuts / fall-backs */}
                <Route path="/"         element={<Navigate to="/Login" />} />
                <Route path="*"         element={<Navigate to="/Login" />} />
            </Routes>
        </BrowserRouter>
    );
}
