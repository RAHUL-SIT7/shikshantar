import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Facilities from './pages/Facilities';
import Gallery from './pages/Gallery';
import AcademicCalendar from './pages/AcademicCalendar';
import Events from './pages/Events';
import NoticeBoard from './pages/NoticeBoard';
import ContactUs from './pages/ContactUs';
import FAQ from './pages/FAQ';
import Alumni from './pages/Alumni';
import Account from './pages/Account';
import AccountAdmin from './pages/AccountAdmin';
import Result from './pages/Result';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Admission from './pages/Admission';
import AdminAdmissions from './pages/AdminAdmissions';
import UserApprovals from './pages/UserApprovals';
import Profile from './pages/Profile';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import FeeStructure from './pages/FeeStructure';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch role from Firestore for security
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (user.email === 'rahulsah4534@gmail.com') {
            setUserRole('admin');
            localStorage.setItem('userRole', 'admin');
            try {
              await setDoc(doc(db, 'users', user.uid), { role: 'admin', email: user.email }, { merge: true });
            } catch (e) {
              console.error("Failed to persist admin role:", e);
            }
          } else if (userDoc.exists()) {
            const role = userDoc.data().role || 'student';
            setUserRole(role);
            localStorage.setItem('userRole', role);
          } else {
            setUserRole('student');
            localStorage.setItem('userRole', 'student');
          }
        } catch (err) {
          console.error("Error fetching role:", err);
          if (user.email === 'rahulsah4534@gmail.com') {
             setUserRole('admin');
             localStorage.setItem('userRole', 'admin');
          } else {
             setUserRole('student');
             localStorage.setItem('userRole', 'student');
          }
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUserRole('student');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#1e3a8a] font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Session...</p>
      </div>
    </div>;
  }

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
        <Route path="/" element={<Layout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userRole={userRole} />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="calendar" element={<AcademicCalendar />} />
          <Route path="events" element={<Events />} />
          <Route path="admission" element={<Admission />} />
          <Route path="fee-structure" element={<FeeStructure />} />
          <Route path="notices" element={<NoticeBoard />} />
          <Route path="contact" element={<ContactUs />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="alumni" element={<Alumni />} />
          <Route 
            path="account" 
            element={isAuthenticated ? <Account /> : <Navigate to="/login" />} 
          />
          <Route 
            path="account-admin" 
            element={isAuthenticated && (userRole === 'admin' || userRole === 'teacher') ? <AccountAdmin /> : <Navigate to="/" />} 
          />
          <Route 
            path="result" 
            element={isAuthenticated ? <Result /> : <Navigate to="/login" />} 
          />
          <Route 
            path="admin" 
            element={isAuthenticated && (userRole === 'admin' || userRole === 'teacher') ? <Admin /> : <Navigate to="/" />} 
          />
          <Route 
            path="admin-admissions" 
            element={isAuthenticated && (userRole === 'admin' || userRole === 'teacher') ? <AdminAdmissions /> : <Navigate to="/" />} 
          />
          <Route 
            path="user-approvals" 
            element={isAuthenticated && userRole === 'admin' ? <UserApprovals /> : <Navigate to="/" />} 
          />
          <Route 
            path="profile" 
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} 
          />
        </Route>
      </Routes>
    </Router>
  );
}
