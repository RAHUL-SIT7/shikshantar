import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Facilities from "./pages/Facilities";
import Gallery from "./pages/Gallery";
import AcademicCalendar from "./pages/AcademicCalendar";
import Events from "./pages/Events";
import NoticeBoard from "./pages/NoticeBoard";
import ContactUs from "./pages/ContactUs";
import FAQ from "./pages/FAQ";
import Alumni from "./pages/Alumni";
import Scholarship from "./pages/Scholarship";
import Account from "./pages/Account";
import AccountAdmin from "./pages/AccountAdmin";
import Result from "./pages/Result";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Admission from "./pages/Admission";
import AdminAdmissions from "./pages/AdminAdmissions";
import UserApprovals from "./pages/UserApprovals";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import TeacherSalary from "./pages/TeacherSalary";
import SalaryAdmin from "./pages/SalaryAdmin";
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";

import FeeStructure from "./pages/FeeStructure";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const localSessionId =
  localStorage.getItem("localSessionId") ||
  Math.random().toString(36).substring(2, 15);
localStorage.setItem("localSessionId", localSessionId);

export const THEMES: Record<string, any> = {
  classic: {
    name: "Classic School",
    emoji: "🏫",
    primary: "#1a2744",
    primaryDark: "#111d33",
    primaryLight: "#2a3754",
    accent: "#ea580c",
    accentHover: "#c2410c",
    preview: ["#1a2744", "#ea580c"],
  },
  modern: {
    name: "Modern Teal",
    emoji: "🌊",
    primary: "#0f766e",
    primaryDark: "#0d6460",
    primaryLight: "#0f8a82",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    preview: ["#0f766e", "#2563eb"],
  },
  ocean: {
    name: "Ocean Breeze",
    emoji: "🌊",
    primary: "#0369a1",
    primaryDark: "#075985",
    primaryLight: "#0284c7",
    accent: "#14b8a6",
    accentHover: "#0d9488",
    preview: ["#0369a1", "#14b8a6"],
  },
  forest_professional: {
    name: "Forest Professional",
    emoji: "🌿",
    primary: "#14532D",
    primaryDark: "#064E3B",
    primaryLight: "#166534",
    accent: "#FACC15",
    accentHover: "#EAB308",
    preview: ["#14532D", "#FACC15"],
  },
  obsidian_gold: {
    name: "Obsidian Gold",
    emoji: "✨",
    primary: "#0C0A09",
    primaryDark: "#000000",
    primaryLight: "#1C1917",
    accent: "#D97706",
    accentHover: "#B45309",
    preview: ["#0C0A09", "#D97706"],
  },
  steel_blue: {
    name: "Steel Blue",
    emoji: "🔷",
    primary: "#1D4ED8",
    primaryDark: "#1E3A8A",
    primaryLight: "#1E40AF",
    accent: "#F97316",
    accentHover: "#EA580C",
    preview: ["#1D4ED8", "#F97316"],
  },
  burgundy_classic: {
    name: "Burgundy Classic",
    emoji: "🍷",
    primary: "#4C0519",
    primaryDark: "#28020D",
    primaryLight: "#881337",
    accent: "#FDE68A",
    accentHover: "#FBBF24",
    preview: ["#4C0519", "#FDE68A"],
  },
  graphite_purple: {
    name: "Graphite Purple",
    emoji: "🔮",
    primary: "#2D2B55",
    primaryDark: "#1E1C38",
    primaryLight: "#3730A3",
    accent: "#A78BFA",
    accentHover: "#8B5CF6",
    preview: ["#2D2B55", "#A78BFA"],
  },
  saffron_modern: {
    name: "Saffron Modern",
    emoji: "🌅",
    primary: "#7C2D12",
    primaryDark: "#431407",
    primaryLight: "#9A3412",
    accent: "#FB923C",
    accentHover: "#F97316",
    preview: ["#7C2D12", "#FB923C"],
  },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>("student");
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("appTheme") || "classic",
  );

  const applyTheme = (key: string, customColors?: any, fontFamily?: string) => {
    const t = customColors ? customColors : THEMES[key];
    if (!t) return;
    const r = document.documentElement;
    r.style.setProperty("--primary", t.primary);
    r.style.setProperty("--primary-dark", t.primaryDark);
    r.style.setProperty("--primary-light", t.primaryLight);
    r.style.setProperty("--accent", t.accent);
    r.style.setProperty("--accent-hover", t.accentHover);
    if (fontFamily) {
      let bodyFont = fontFamily;
      let headingFont = fontFamily;
      let tracking = "normal";

      if (fontFamily.includes("|")) {
        [bodyFont, headingFont] = fontFamily.split("|");
      }

      if (fontFamily.includes("Cormorant Garamond")) {
        tracking = "0.02em";
      } else if (fontFamily.includes("Outfit")) {
        tracking = "-0.015em";
      }

      r.style.setProperty("--font-family", bodyFont);
      r.style.setProperty("--font-heading", headingFont);
      r.style.setProperty("--tracking-base", tracking);

      // Handle text color for light themes
      if (
        t.primary.toUpperCase() === "#F8FAFC" ||
        t.primary.toUpperCase() === "#FFFFFF"
      ) {
        r.style.setProperty("--sidebar-text", "#0F172A");
      } else {
        r.style.setProperty("--sidebar-text", "#ffffff");
      }

      localStorage.setItem("appFontFamily", fontFamily);
    }
    setActiveTheme(key);
    if (!customColors) {
      localStorage.setItem("appTheme", key);
      localStorage.removeItem("appCustomTheme");
    } else {
      localStorage.setItem("appTheme", "custom");
      localStorage.setItem("appCustomTheme", JSON.stringify(t));
    }
  };

  useEffect(() => {
    const applyLocal = () => {
      const savedTheme = localStorage.getItem("appTheme") || "classic";
      const savedFont =
        localStorage.getItem("appFontFamily") ||
        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      if (savedTheme === "custom") {
        try {
          const customT = JSON.parse(
            localStorage.getItem("appCustomTheme") || "{}",
          );
          applyTheme("custom", customT, savedFont);
        } catch (e) {
          applyTheme("classic", null, savedFont);
        }
      } else {
        applyTheme(savedTheme, null, savedFont);
      }
    };

    // Initial load
    applyLocal();

    // Listen for global settings changes
    const unsub = onSnapshot(
      doc(db, "settings", "global"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data) {
            const font =
              data.fontFamily ||
              "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            applyTheme(
              data.themeKey || "classic",
              data.customColors || null,
              font,
            );
          }
        }
      },
      (err) => {
        console.warn(
          "Could not load global settings (might need auth first).",
          err,
        );
      },
    );

    return () => unsub();
  }, []);

  // Make applyTheme accessible globally so ThemeSettings can call it without props plumbing
  useEffect(() => {
    (window as any).applyThemeGlobal = applyTheme;
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forcedRole = urlParams.get("previewRole");

    if (forcedRole) {
      setUserRole(forcedRole);
      setIsAuthenticated(forcedRole !== "guest");
      setLoading(false);
    }

    let unSubDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (forcedRole) return; // prevent overriding the forced state

      if (user) {
        // Fetch role from Firestore for security
        try {
          // Avoid indefinite hanging if Firestore is blocked
          const userDoc = await Promise.race([
            getDoc(doc(db, "users", user.uid)),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Firestore timeout")), 8000),
            ),
          ]);

          let roleToSet = "student";

          if (user.email === "rahulsah4534@gmail.com") {
            roleToSet = "admin";
            setDoc(
              doc(db, "users", user.uid),
              {
                role: "admin",
                email: user.email,
                activeSessions: arrayUnion(localSessionId),
              },
              { merge: true },
            ).catch((e) => console.error("Failed to persist admin role:", e));
          } else if (userDoc && userDoc.exists()) {
            roleToSet = userDoc.data().role || "student";
            setDoc(
              doc(db, "users", user.uid),
              { activeSessions: arrayUnion(localSessionId) },
              { merge: true },
            ).catch((e) => console.warn("Failed to set active session:", e));
          } else {
            // Document doesn't exist! They might be signing up right now OR they were deleted.
            if (window.location.pathname !== "/login") {
              await signOut(auth);
              setIsAuthenticated(false);
              setLoading(false);
              return;
            }
          }

          setUserRole(roleToSet);
          localStorage.setItem("userRole", roleToSet);

          let docExisted = userDoc ? userDoc.exists() : false;

          // Setup real-time listener for cross-device logout
          unSubDoc = onSnapshot(
            doc(db, "users", user.uid),
            (docSnap) => {
              if (docSnap.exists()) {
                docExisted = true;
                const data = docSnap.data();
                if (data.activeSessions && Array.isArray(data.activeSessions)) {
                  if (!data.activeSessions.includes(localSessionId)) {
                    // Session was revoked
                    signOut(auth);
                  }
                }
              } else {
                if (docExisted && user.email !== "rahulsah4534@gmail.com") {
                  // Profile deleted while actively using the app!
                  signOut(auth);
                  window.location.reload();
                }
              }
            },
            (err) => {
              console.warn("Could not load user active sessions:", err.message);
            },
          );
        } catch (err) {
          console.error("Error fetching role:", err);
          if (user.email === "rahulsah4534@gmail.com") {
            setUserRole("admin");
            localStorage.setItem("userRole", "admin");
          } else {
            setUserRole("student");
            localStorage.setItem("userRole", "student");
          }
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUserRole("student");
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
    return (
      <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 bg-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">
            Syncing Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login setIsAuthenticated={setIsAuthenticated} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/"
          element={
            <Layout
              isAuthenticated={isAuthenticated}
              setIsAuthenticated={setIsAuthenticated}
              userRole={userRole}
            />
          }
        >
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="calendar" element={<AcademicCalendar />} />
          <Route path="events" element={<Events />} />
          <Route path="admission" element={<Admission />} />
          <Route path="fee-structure" element={<FeeStructure />} />
          <Route
            path="scholarship"
            element={<Scholarship userRole={userRole} />}
          />
          <Route path="notices" element={<NoticeBoard />} />
          <Route path="contact" element={<ContactUs />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="alumni" element={<Alumni />} />
          <Route
            path="result"
            element={isAuthenticated ? <Result /> : <Navigate to="/login" />}
          />
          <Route
            path="account"
            element={
              isAuthenticated && userRole === "student" ? (
                <Account />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="account-admin"
            element={
              isAuthenticated && userRole === "admin" ? (
                <AccountAdmin />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="teacher-salary"
            element={
              isAuthenticated && userRole === "teacher" ? (
                <TeacherSalary />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="salary-admin"
            element={
              isAuthenticated && userRole === "admin" ? (
                <SalaryAdmin />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="admin"
            element={
              isAuthenticated &&
              (userRole === "admin" || userRole === "teacher") ? (
                <Admin />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="admin-admissions"
            element={
              isAuthenticated && userRole === "admin" ? (
                <AdminAdmissions />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="user-approvals"
            element={
              isAuthenticated && userRole === "admin" ? (
                <UserApprovals />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
          />
          <Route
            path="settings"
            element={
              isAuthenticated && userRole === "admin" ? (
                <Settings />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
}
