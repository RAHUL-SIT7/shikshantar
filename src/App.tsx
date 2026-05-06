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
import ThemeSettings from './pages/ThemeSettings';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, arrayUnion } from 'firebase/firestore';

import FeeStructure from './pages/FeeStructure';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const localSessionId = localStorage.getItem('localSessionId') || Math.random().toString(36).substring(2, 15);
localStorage.setItem('localSessionId', localSessionId);

export const THEMES: Record<string, any> = {
  classic: {
    name: "Classic School",
    emoji: "🏫",
    primary:      "#1a2744",
    primaryDark:  "#111d33",
    primaryLight: "#2a3754",
    accent:       "#ea580c",
    accentHover:  "#c2410c",
    preview:      ["#1a2744", "#ea580c"]
  },
  royal: {
    name: "Royal Blue",
    emoji: "👑",
    primary:      "#1e3a8a",
    primaryDark:  "#1e3179",
    primaryLight: "#2146a8",
    accent:       "#f59e0b",
    accentHover:  "#d97706",
    preview:      ["#1e3a8a", "#f59e0b"]
  },
  nature: {
    name: "Nature Green",
    emoji: "🌿",
    primary:      "#166534",
    primaryDark:  "#14532d",
    primaryLight: "#15803d",
    accent:       "#ca8a04",
    accentHover:  "#a16207",
    preview:      ["#166534", "#ca8a04"]
  },
  elegant: {
    name: "Elegant Maroon",
    emoji: "🌸",
    primary:      "#7f1d1d",
    primaryDark:  "#6b1a1a",
    primaryLight: "#991b1b",
    accent:       "#b45309",
    accentHover:  "#92400e",
    preview:      ["#7f1d1d", "#b45309"]
  },
  modern: {
    name: "Modern Teal",
    emoji: "🌊",
    primary:      "#0f766e",
    primaryDark:  "#0d6460",
    primaryLight: "#0f8a82",
    accent:       "#2563eb",
    accentHover:  "#1d4ed8",
    preview:      ["#0f766e", "#2563eb"]
  },
  royal_purple: {
    name: "Royal Purple",
    emoji: "💜",
    primary:      "#4c1d95",
    primaryDark:  "#3b1678",
    primaryLight: "#5b21b6",
    accent:       "#db2777",
    accentHover:  "#be185d",
    preview:      ["#4c1d95", "#db2777"]
  },
  midnight: {
    name: "Midnight Dark",
    emoji: "🌙",
    primary:      "#111827",
    primaryDark:  "#0a0f1a",
    primaryLight: "#1f2937",
    accent:       "#06b6d4",
    accentHover:  "#0891b2",
    preview:      ["#111827", "#06b6d4"]
  },
  crimson: {
    name: "Crimson Bold",
    emoji: "🔴",
    primary:      "#991b1b",
    primaryDark:  "#7f1d1d",
    primaryLight: "#b91c1c",
    accent:       "#1d4ed8",
    accentHover:  "#1e40af",
    preview:      ["#991b1b", "#1d4ed8"]
  }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('student');
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('appTheme') || "classic");

  const applyTheme = (key: string, customColors?: any, fontFamily?: string) => {
    const t = customColors ? customColors : THEMES[key];
    if (!t) return;
    const r = document.documentElement;
    r.style.setProperty("--primary",       t.primary);
    r.style.setProperty("--primary-dark",  t.primaryDark);
    r.style.setProperty("--primary-light", t.primaryLight);
    r.style.setProperty("--accent",        t.accent);
    r.style.setProperty("--accent-hover",  t.accentHover);
    if (fontFamily) {
       r.style.setProperty("--font-family", fontFamily);
       localStorage.setItem('appFontFamily', fontFamily);
    }
    setActiveTheme(key);
    if (!customColors) {
       localStorage.setItem('appTheme', key);
       localStorage.removeItem('appCustomTheme');
    } else {
       localStorage.setItem('appTheme', 'custom');
       localStorage.setItem('appCustomTheme', JSON.stringify(t));
    }
  };

  useEffect(() => {
     const applyLocal = () => {
         const savedTheme = localStorage.getItem('appTheme') || 'classic';
         const savedFont = localStorage.getItem('appFontFamily') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
         if (savedTheme === 'custom') {
            try {
               const customT = JSON.parse(localStorage.getItem('appCustomTheme') || "{}");
               applyTheme('custom', customT, savedFont);
            } catch(e) {
               applyTheme('classic', null, savedFont);
            }
         } else {
            applyTheme(savedTheme, null, savedFont);
         }
     };

     // Initial load
     applyLocal();

     // Listen for global settings changes
     const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
           const data = snap.data();
           if (data) {
              const font = data.fontFamily || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
              applyTheme(data.themeKey || 'classic', data.customColors || null, font);
           }
        }
     }, (err) => {
        console.warn("Could not load global settings (might need auth first).", err);
     });

     return () => unsub();
  }, []);

  // Make applyTheme accessible globally so ThemeSettings can call it without props plumbing
  useEffect(() => {
     (window as any).applyThemeGlobal = applyTheme;
  }, []);

  useEffect(() => {
    let unSubDoc: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch role from Firestore for security
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (user.email === 'rahulsah4534@gmail.com') {
            setUserRole('admin');
            localStorage.setItem('userRole', 'admin');
            try {
              await setDoc(doc(db, 'users', user.uid), { role: 'admin', email: user.email, activeSessions: arrayUnion(localSessionId) }, { merge: true });
            } catch (e) {
              console.error("Failed to persist admin role:", e);
            }
          } else if (userDoc.exists()) {
             const data = userDoc.data();
             const role = data.role || 'student';
             setUserRole(role);
             localStorage.setItem('userRole', role);
             try {
               await setDoc(doc(db, 'users', user.uid), { activeSessions: arrayUnion(localSessionId) }, { merge: true });
             } catch(e) {}
          } else {
            setUserRole('student');
            localStorage.setItem('userRole', 'student');
          }
          
          // Setup real-time listener for cross-device logout
          unSubDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
             if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.activeSessions && Array.isArray(data.activeSessions)) {
                   if (!data.activeSessions.includes(localSessionId)) {
                      // Session was revoked
                      signOut(auth);
                   }
                }
             }
          });
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
        if (unSubDoc) {
           unSubDoc();
           unSubDoc = null;
        }
      }
      setLoading(false);
    });

    return () => {
       unsubscribe();
       if (unSubDoc) unSubDoc();
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 bg-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">Syncing Session...</p>
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
            element={isAuthenticated && (userRole === 'admin' || userRole === 'teacher') ? <UserApprovals /> : <Navigate to="/" />} 
          />
          <Route 
            path="profile" 
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} 
          />
          <Route 
            path="theme-settings" 
            element={isAuthenticated && (userRole === 'admin') ? <ThemeSettings /> : <Navigate to="/" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
}
