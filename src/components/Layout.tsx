import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { formatBSDate, getBSYearMonthDate } from '../lib/nepaliDate';
import { Menu, X, Home, Building, Image, Calendar, User, FileText, LogOut, LogIn, Info, Settings, Upload, CreditCard, Shield, Bell, Megaphone, Check, Users, MapPin } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, updateDoc, doc, getDoc, arrayUnion } from 'firebase/firestore';
const logoImage = 'https://i.postimg.cc/SxGS5WxY/logo.png';

interface Notice {
  id: string;
  title: string;
  priority: string;
  status: string;
  targets: string[];
  date: string;
  readBy?: string[];
  isAdmission?: boolean;
}

export default function Layout({ 
  isAuthenticated, 
  setIsAuthenticated, 
  userRole 
}: { 
  isAuthenticated: boolean, 
  setIsAuthenticated: (val: boolean) => void,
  userRole: string
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [pendingAdmissions, setPendingAdmissions] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Calculate current NPT (Nepal Standard Time) date
  // NPT is UTC+5:45
  const getNPTDate = () => {
    const now = new Date();
    // get UTC time in ms
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    // NPT offset is 5 hours and 45 minutes = (5 * 60 + 45) = 345 minutes = 345 * 60000 ms
    const nptTime = new Date(utcTime + (345 * 60000));
    return nptTime;
  };

  const [currentTime, setCurrentTime] = useState(getNPTDate());
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = React.useRef<HTMLElement>(null);
  
  const role = userRole || 'student';
  const studentId = localStorage.getItem('studentId') || '';
  
  const logoUrl = logoImage;

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getNPTDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubNotices = () => {};
    let unsubAdmissions = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
         try {
           const userDoc = await getDoc(doc(db, 'users', user.uid));
           if (userDoc.exists()) {
              setAvatarUrl(userDoc.data().avatarUrl || null);
           }
         } catch (e) { console.warn(e); }
      } else {
         setAvatarUrl(null);
      }

      // For non-admins/teachers OR if user is not fully loaded, MUST filter by status=='Published'
      const isPrivileged = user && (role === 'admin' || role === 'teacher');
      
      let q = query(collection(db, 'notices'), orderBy('date', 'desc'));

      unsubNotices = onSnapshot(q, (snap) => {
        let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notice[];

        if (!isPrivileged) {
           data = data.filter(n => n.status === 'Published');
        }
        if (role !== 'admin') {
           if (role === 'teacher') {
              data = data.filter(n => Array.isArray(n.targets) && (n.targets.includes('All') || n.targets.includes('Teachers Only')));
           } else {
              const studentClass = localStorage.getItem('studentClass') || '';
              // only show 'Students Only' if they are logged in as a student (user exists)
              data = data.filter(n => Array.isArray(n.targets) && (n.targets.includes('All') || (user && n.targets.includes('Students Only')) || (studentClass && n.targets.includes(`Class ${studentClass}`))));
           }
        } else {
           data = data.filter(n => n.status !== 'Archived');
        }
        setRecentNotices(data);
      }, (error: any) => {
        if (isPrivileged && error?.message?.includes('Missing or insufficient permissions')) {
           console.warn("Privilege mismatch detected. Clearing local role to fallback to student view.");
           localStorage.removeItem('userRole');
           window.location.reload();
        } else {
           handleFirestoreError(error, OperationType.LIST, 'notices');
        }
      });

      if (user && role === 'admin') {
        const qAdmissions = query(collection(db, 'admissions'), where('status', '==', 'Pending'));
        unsubAdmissions = onSnapshot(qAdmissions, (snap) => {
          setPendingAdmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error: any) => {
          if (error?.message?.includes('Missing or insufficient permissions')) {
             localStorage.removeItem('userRole');
             window.location.reload();
          } else {
             handleFirestoreError(error, OperationType.LIST, 'admissions');
          }
        });
      } else {
        setPendingAdmissions([]);
      }
    });

    return () => { unsubNotices(); unsubAdmissions(); unsubAuth(); };
  }, [role]);

  // Local Read Receipts for visual immediate update and guest users
  const [localReads, setLocalReads] = useState<string[]>([]);
  useEffect(() => {
     try {
         const reads = JSON.parse(localStorage.getItem('localReadNotices') || '[]');
         setLocalReads(reads);
     } catch(e) {}
  }, []);

  // Merge notices and admissions for the bell
  // Only include items that the current user has NOT read.
  const currentUidForFilter = auth.currentUser?.uid || studentId || 'guest';
  const combinedBellItems = [
    ...pendingAdmissions.filter(a => (!a.readBy || !a.readBy.includes(currentUidForFilter)) && !localReads.includes(a.id)).map(a => ({
      id: a.id,
      title: `Admission Request: ${a.studentName || 'Student'}`,
      priority: 'Urgent',
      date: a.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      isAdmission: true,
      readBy: a.readBy || []
    })),
    ...recentNotices.filter(n => (!n.readBy || !n.readBy.includes(currentUidForFilter)) && !localReads.includes(n.id)).map(n => ({
      ...n,
      isAdmission: false,
      date: n.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10); // Show more items if needed

  // Calculate Academic Year based on current NPT Year and Month
  // Nepali New Year (Bysakh 1) typically falls in mid-April. 
  // For simplicity: If Gregorian month >= 4 (April), BS year = Gregorian + 57. Else + 56.
  const currentGregorianYear = currentTime.getFullYear();
  const currentGregorianMonth = currentTime.getMonth() + 1; // 1-12
  const currentGregorianDate = currentTime.getDate();

  let currentBSYear = currentGregorianYear + 56;
  try {
     currentBSYear = getBSYearMonthDate(new Date()).year;
  } catch(e){}
  const academicYearString = `${currentBSYear}-${currentBSYear + 1} B.S.`;

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Base navigation for all roles
  const baseNavigation = [
    { name: 'Home Dashboard', href: '/', icon: Home, group: 1 },
    { name: 'Notice Board', href: '/notices', icon: Megaphone, group: 1 },
    { name: 'About Us', href: '/about', icon: Info, group: 4 },
    { name: 'Facilities', href: '/facilities', icon: Building, group: 4 },
    { name: 'Photo Gallery', href: '/gallery', icon: Image, group: 4 },
    { name: 'Academic Calendar', href: '/calendar', icon: Calendar, group: 4 },
    { name: 'Fee Structure', href: '/fee-structure', icon: CreditCard, group: 4 },
    { name: 'Admission Form', href: '/admission', icon: FileText, group: 4 },
  ];

  // Role specific navigation
  const getRoleNavigation = () => {
    let nav = [...baseNavigation];
    
    if (!isAuthenticated) {
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (!isGuest) {
        nav.push({ name: 'Academic Result', href: '/login', icon: FileText, group: 3 });
        nav.push({ name: 'Account & Fees', href: '/login', icon: CreditCard, group: 3 });
      }
      return nav.sort((a, b) => a.group - b.group);
    }

    if (role === 'student') {
      nav.push({ name: 'Academic Result', href: '/result', icon: FileText, group: 3 });
      nav.push({ name: 'My Fee Status', href: '/account', icon: CreditCard, group: 3 });
      nav.push({ name: 'My Profile', href: '/profile', icon: User, group: 6 });
    } else if (role === 'teacher') {
      nav.push({ name: 'Admissions List', href: '/admin-admissions', icon: User, group: 2 });
      nav.push({ name: 'Manage Results', href: '/admin', icon: Upload, group: 3 });
      nav.push({ name: 'Fee Management', href: '/account-admin', icon: CreditCard, group: 3 });
      nav.push({ name: 'My Profile', href: '/profile', icon: User, group: 6 });
    } else if (role === 'admin') {
      nav.push({ name: 'Students', href: '/user-approvals?filter=student', icon: Users, group: 2 });
      nav.push({ name: 'Teachers & Staff', href: '/user-approvals?filter=teacher', icon: Users, group: 2 });
      nav.push({ name: 'Admissions List', href: '/admin-admissions', icon: User, group: 2 });
      nav.push({ name: 'Manage Results', href: '/admin', icon: Upload, group: 3 });
      nav.push({ name: 'Fee Management', href: '/account-admin', icon: CreditCard, group: 3 });
      nav.push({ name: 'Administrative User Management', href: '/user-approvals', icon: Shield, group: 5 });
      nav.push({ name: 'My Profile', href: '/profile', icon: User, group: 6 });
    }
    
    return nav.sort((a, b) => a.group - b.group);
  };

  const navigation = getRoleNavigation();

  // Combine Unread counts
  const currentUid = auth.currentUser?.uid || studentId || 'guest';
  const unreadNoticesCount = recentNotices.filter(n => (!n.readBy || !n.readBy.includes(currentUid)) && !localReads.includes(n.id)).length;
  const unreadAdmissionsCount = pendingAdmissions.filter(a => (!a.readBy || !a.readBy.includes(currentUid)) && !localReads.includes(a.id)).length;
  const unreadUrgentCount = role === 'admin' ? unreadNoticesCount + unreadAdmissionsCount : unreadNoticesCount;

  const markAsRead = async (noticeId: string, isAdmission: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent navigation
    
    // Save locally
    const newReads = [...localReads, noticeId];
    setLocalReads(newReads);
    localStorage.setItem('localReadNotices', JSON.stringify(newReads));

    const uid = auth.currentUser?.uid || studentId || 'guest';
    const collectionName = isAdmission ? 'admissions' : 'notices';
    try {
        await updateDoc(doc(db, collectionName, noticeId), {
            readBy: arrayUnion(uid)
        });
    } catch(err) {
        console.warn(`Could not mark ${collectionName} as read (permission expected for guests/students)`, err);
    }
  };

  const markAllAsRead = async () => {
    const uid = auth.currentUser?.uid || studentId || 'guest';
    const updates: any[] = [];
    const newReads = [...localReads];
    
    recentNotices.forEach(n => {
      if (!n.readBy || !n.readBy.includes(uid)) {
        if (!newReads.includes(n.id)) newReads.push(n.id);
        updates.push(
          updateDoc(doc(db, 'notices', n.id), {
            readBy: arrayUnion(uid)
          }).catch(err => {
            console.warn("Failed to mark notice read (expected for students):", err);
          })
        );
      }
    });

    if (role === 'admin') {
      pendingAdmissions.forEach(a => {
        if (!a.readBy || !a.readBy.includes(uid)) {
          if (!newReads.includes(a.id)) newReads.push(a.id);
          updates.push(
            updateDoc(doc(db, 'admissions', a.id), {
              readBy: arrayUnion(uid)
            }).catch(err => {
              console.warn("Failed to mark admission read:", err);
            })
          );
        }
      });
    }

    setLocalReads(newReads);
    localStorage.setItem('localReadNotices', JSON.stringify(newReads));

    if (updates.length > 0) {
      try {
        await Promise.all(updates);
      } catch (err) {
        console.warn("Error marking all as read:", err);
      }
    }
    setIsBellOpen(false); // Always close the dropdown
  };

  return (
    <div className="h-screen w-full flex bg-[#f3f4f6] text-[#1f2937] overflow-hidden print:h-auto print:bg-white" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Sidebar Navigation */}
      <aside className="w-[220px] bg-[#1e3a8a] text-white flex-col py-5 hidden md:flex shrink-0 print:hidden">
        <div className="px-5 pb-[30px] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-white p-1 mb-3 shadow-md flex items-center justify-center">
            <img src={logoUrl} alt="Shikshantar Academy Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <h1 className="text-[1.2rem] tracking-[1px] mb-[5px] font-bold">SHIKSHANTAR</h1>
          <span className="text-[0.7rem] opacity-80 block uppercase">Academy | Siraha</span>
        </div>
        
        <div className="px-5 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 overflow-hidden">
            {avatarUrl ? (
               <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
               <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-[0.8rem] font-bold truncate">
              {isAuthenticated ? `Logged in as ${role}` : (localStorage.getItem('isGuest') === 'true' ? 'Guest Mode' : 'Not Logged In')}
            </div>
            <div className="text-[0.65rem] opacity-70 truncate">
              {isAuthenticated ? 'Active Session' : (localStorage.getItem('isGuest') === 'true' ? 'Viewing Site' : 'Please login')}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 text-[0.65rem] font-bold uppercase tracking-[1px] opacity-50 mb-2 shrink-0">Menu</div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
            <ul className="list-none p-0 m-0 pb-4">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const showSeparator = index > 0 && navigation[index - 1].group !== item.group;
                return (
                  <React.Fragment key={item.name}>
                    {showSeparator && <li className="my-2 border-t border-white/10 mx-4"></li>}
                    <li>
                      <Link
                        to={item.href}
                        className={`px-6 py-2.5 text-[0.85rem] cursor-pointer flex items-center gap-3 transition-colors border-l-4 ${
                          location.pathname === item.href 
                            ? 'bg-white/10 border-[#f97316]' 
                            : 'border-transparent hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    </li>
                  </React.Fragment>
                );
              })}
              
              <li className="mt-2 border-t border-white/10 pt-2 border-opacity-50 mx-4"></li>
              
              {isAuthenticated ? (
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full px-6 py-2.5 text-[0.85rem] cursor-pointer flex items-center gap-3 transition-colors border-l-4 border-transparent hover:bg-white/5 text-[#fca5a5]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout Session
                  </button>
                </li>
              ) : (
                <li>
                  <Link
                    to="/login"
                    className={`px-6 py-2.5 text-[0.85rem] cursor-pointer flex items-center gap-3 transition-colors border-l-4 ${
                      location.pathname === '/login' 
                        ? 'bg-white/10 border-[#fca5a5] text-[#fca5a5]' 
                        : 'border-transparent hover:bg-white/5 text-[#fca5a5]'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
        
        <div className="shrink-0 p-4 border-t border-white/10 bg-[#1e40af]/30">
          <div className="text-[0.65rem] opacity-60 uppercase tracking-wider font-bold">Academic Year</div>
          <div className="text-[0.85rem] font-bold text-white shadow-sm">{academicYearString}</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#1e3a8a] text-white p-4 flex justify-between items-center shrink-0 print:hidden shadow-md relative z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 flex items-center justify-center">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <div className="font-bold tracking-wide">SHIKSHANTAR</div>
              <div className="text-[0.6rem] uppercase opacity-80 leading-none">Academy | Siraha</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsBellOpen(!isBellOpen)} className="relative p-1 rounded-lg hover:bg-white/10 transition-colors">
                <Bell className="w-6 h-6" />
                {unreadUrgentCount > 0 && (
                   <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-[#1e3a8a] text-white">
                      {unreadUrgentCount}
                   </span>
                )}
             </button>
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
               {isMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
             </button>
          </div>
        </div>

    {isBellOpen && (
      <div className="absolute top-[72px] right-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 md:hidden overflow-hidden flex flex-col">
         <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
            <span className="font-bold text-[0.8rem] text-gray-700 uppercase tracking-wide">Notifications</span>
            {unreadUrgentCount > 0 && (
               <button 
                 onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                 className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded-md"
               >
                  Mark all read
               </button>
            )}
         </div>
         <div className="max-h-80 overflow-y-auto pt-4 pb-2 px-1 custom-scrollbar">
            {combinedBellItems.length > 0 ? combinedBellItems.map(n => (
               <div key={n.id} onClick={() => { setIsBellOpen(false); navigate(n.isAdmission ? '/admin-admissions' : '/notices'); }} className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group relative">
                  <div className="flex justify-between items-center mb-1.5 pr-8">
                     <span className={`text-[9px] leading-tight font-bold px-1.5 py-0.5 rounded uppercase flex items-center h-4 border border-current/10 ${n.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{n.isAdmission ? 'Admission' : n.priority}</span>
                     {(!n.readBy || !n.readBy.includes(auth.currentUser?.uid || studentId || 'guest')) && !localReads.includes(n.id) && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm ring-2 ring-white"></span>}
                  </div>
                  <p className="font-bold text-[0.8rem] text-gray-800 line-clamp-2 pr-10 leading-snug">{n.title}</p>
                  
                  {(!n.readBy || !n.readBy.includes(auth.currentUser?.uid || studentId || 'guest')) && !localReads.includes(n.id) && (
                      <button 
                         onClick={(e) => markAsRead(n.id, !!n.isAdmission, e)}
                         className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white hover:bg-blue-600 text-blue-500 hover:text-white rounded-full transition-all z-10 border border-blue-100 shadow-sm"
                         title="Mark as read"
                      >
                         <Check className="w-4 h-4" />
                      </button>
                  )}
               </div>
            )) : <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                   <Bell className="w-8 h-8 opacity-20" />
                   No notifications
                 </div>}
         </div>
         <div className="p-2 bg-gray-50 text-center border-t border-gray-100">
            <button onClick={() => { setIsBellOpen(false); navigate('/notices'); }} className="text-sm font-bold text-blue-600 hover:text-blue-800 w-full text-center block outline-none">Open Notice Board</button>
         </div>
      </div>
    )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#1e3a8a] text-white absolute top-[72px] left-0 right-0 z-50 border-t border-white/10 shadow-xl overflow-y-auto max-h-[calc(100vh-72px)] pb-6">
            <div className="px-6 py-4 flex items-center gap-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[0.85rem] font-bold truncate">
                  {isAuthenticated ? `Logged in as ${role}` : (localStorage.getItem('isGuest') === 'true' ? 'Guest Mode' : 'Not Logged In')}
                </div>
                <div className="text-[0.7rem] opacity-70 truncate">
                  {isAuthenticated ? 'Active Session' : (localStorage.getItem('isGuest') === 'true' ? 'Viewing Site' : 'Please login')}
                </div>
              </div>
            </div>

            <ul className="list-none p-0 m-0">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-6 py-3.5 text-[0.95rem] border-l-4 ${
                        location.pathname === item.href ? 'bg-white/10 border-[#f97316]' : 'border-transparent active:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5 opacity-80" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
              {isAuthenticated ? (
                <li className="mt-4 border-t border-white/10 pt-2">
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 text-left px-6 py-3.5 text-[0.95rem] text-[#fca5a5] border-l-4 border-transparent active:bg-white/5">
                    <LogOut className="w-5 h-5 opacity-80" />
                    Logout Session
                  </button>
                </li>
              ) : (
                <li className="mt-4 border-t border-white/10 pt-2">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-6 py-3.5 text-[0.95rem] border-l-4 border-transparent active:bg-white/5">
                    <LogIn className="w-5 h-5 opacity-80" />
                    Login to Portal
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Header */}
        <header className="bg-white p-5 flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.05)] shrink-0 z-30 hidden md:flex print:hidden relative">
          {role === 'admin' && location.pathname === '/' ? (
             <div className="flex items-center gap-3">
               <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-full border border-gray-200 shadow-sm" />
               <div className="flex flex-col justify-center">
                  <h1 className="text-base font-bold text-[#1e3a8a] leading-none mb-1">Shikshantar Academy | Siraha</h1>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none">Admin Control Panel</p>
               </div>
             </div>
          ) : (
            <div className="text-[1.2rem] font-bold text-[#1f2937]">
              {navigation.find(n => n.href === location.pathname)?.name || 'Portal'}
            </div>
          )}
          <div className="flex items-center gap-6">
            <div className="relative">
               <button onClick={() => setIsBellOpen(!isBellOpen)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors relative">
                  <Bell className="w-5 h-5 text-gray-700" />
                  {unreadUrgentCount > 0 && (
                     <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white text-white">
                        {unreadUrgentCount}
                     </span>
                  )}
               </button>
               {isBellOpen && (
                 <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
                    <div className="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                       <span className="font-bold text-[0.8rem] text-gray-700 uppercase tracking-wide">Notifications</span>
                       {unreadUrgentCount > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-md"
                          >
                             Mark all read
                          </button>
                       )}
                    </div>
                    <div className="max-h-80 overflow-y-auto pt-4 pb-2 px-1 custom-scrollbar">
                       {combinedBellItems.length > 0 ? combinedBellItems.map(n => (
                          <div key={n.id} onClick={() => { setIsBellOpen(false); navigate(n.isAdmission ? '/admin-admissions' : '/notices'); }} className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group relative">
                             <div className="flex justify-between items-center mb-2 pr-10">
                                <span className={`text-[9px] leading-none font-bold px-1.5 py-0.5 rounded uppercase flex items-center h-4 border border-current/10 ${n.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{n.isAdmission ? 'Admission' : n.priority}</span>
                                {(!n.readBy || !n.readBy.includes(auth.currentUser?.uid || studentId || 'guest')) && !localReads.includes(n.id) && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm ring-2 ring-white"></span>}
                             </div>
                             <p className="font-bold text-[0.8rem] text-gray-800 line-clamp-2 pr-10 leading-snug">{n.title}</p>

                             {(!n.readBy || !n.readBy.includes(auth.currentUser?.uid || studentId || 'guest')) && !localReads.includes(n.id) && (
                                <button 
                                   onClick={(e) => markAsRead(n.id, !!n.isAdmission, e)}
                                   className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white hover:bg-blue-600 text-blue-500 hover:text-white rounded-full transition-all scale-90 hover:scale-100 z-10 border border-blue-100 shadow-sm"
                                   title="Mark as read"
                                >
                                   <Check className="w-4 h-4" />
                                </button>
                             )}
                          </div>
                       )) : <div className="p-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                              <Bell className="w-8 h-8 opacity-20" />
                              No recent notifications
                            </div>}
                    </div>
                    <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                       <button onClick={() => { setIsBellOpen(false); navigate('/notices'); }} className="text-sm font-bold text-blue-600 hover:text-blue-800 w-full text-center block outline-none">Open Notice Board</button>
                    </div>
                 </div>
               )}
            </div>
            
            <div className="text-right border-l border-gray-200 pl-6">
              <div className="text-[0.8rem] font-bold flex items-center justify-end gap-2 text-[#1f2937]">
                {isAuthenticated ? (
                   <span className="px-2.5 py-0.5 rounded-full bg-[#1e3a8a] text-white text-[10px] uppercase font-black tracking-widest shadow-sm">
                      {role.toUpperCase()}
                   </span>
                ) : 'Guest User'}
              </div>
              <div className="text-[11px] text-[#6b7280] font-mono mt-1 font-semibold">
                {formatBSDate(new Date())} | {academicYearString}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center border border-[#e5e7eb] overflow-hidden shadow-sm">
              <User className="w-5 h-5 text-[#6b7280]" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto custom-scrollbar print:overflow-visible print:p-0 relative">
          <div className="p-5 flex-1">
            <div className="max-w-6xl mx-auto min-h-full">
              <Outlet />
            </div>
          </div>

          {/* Professional Footer */}
          <footer className="bg-[#1e3a8a] text-white py-10 shrink-0 print:hidden mt-auto border-t-[4px] border-[#f97316]">
            <div className="max-w-6xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Branding Section */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full p-1 shadow-md">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-wide leading-tight">SHIKSHANTAR</h3>
                    <p className="text-xs uppercase opacity-80 tracking-widest font-semibold">Academy | Siraha</p>
                  </div>
                </div>
                <p className="text-sm opacity-80 leading-relaxed max-w-sm mt-2">
                  Empowering the next generation through quality education, character building, and excellence in all academic endeavors.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-bold text-sm uppercase tracking-widest opacity-60 mb-4 border-b border-white/20 pb-2 inline-block">Quick Links</h4>
                <ul className="space-y-2 text-sm opacity-90 font-medium">
                  <li><Link to="/about" className="hover:text-[#f97316] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#f97316] rounded-full inline-block"></span> About Us</Link></li>
                  <li><Link to="/admission" className="hover:text-[#f97316] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#f97316] rounded-full inline-block"></span> Admission Form</Link></li>
                  <li><Link to="/fee-structure" className="hover:text-[#f97316] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#f97316] rounded-full inline-block"></span> Fee Structure</Link></li>
                  <li><Link to="/notices" className="hover:text-[#f97316] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#f97316] rounded-full inline-block"></span> Notice Board</Link></li>
                  <li><Link to="/gallery" className="hover:text-[#f97316] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#f97316] rounded-full inline-block"></span> Photo Gallery</Link></li>
                  {(!isAuthenticated || localStorage.getItem('isGuest') === 'true') && (
                    <li><Link to="/login" className="hover:text-[#f97316] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#f97316] rounded-full inline-block"></span> Login Portal</Link></li>
                  )}
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="font-bold text-sm uppercase tracking-widest opacity-60 mb-4 border-b border-white/20 pb-2 inline-block">Contact Us</h4>
                <ul className="space-y-3 justify-center text-sm opacity-90 mb-6">
                  <li className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-[#f97316] shrink-0" />
                    <span>Location: Karjanha Municipality, Ward No. 05, Siraha, Madhesh Province, Nepal.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Megaphone className="w-5 h-5 text-[#f97316] shrink-0" />
                    <span>Postal Code: 56500</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#f97316] shrink-0" />
                    <span>Dedicated to Bright Futures</span>
                  </li>
                </ul>
                <a 
                  href="https://maps.app.goo.gl/n3Y7iLB1fry5cqtX9" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-[#f97316] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-[#ea580c] transition-colors active:scale-95"
                >
                  <MapPin className="w-4 h-4" />
                  Find Us
                </a>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 mt-10 pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs opacity-60 font-medium">
                &copy; {new Date().getFullYear()} Shikshantar Academy, Siraha. All rights reserved.
              </p>
              <div className="text-xs opacity-60 font-medium">
                Designed & Developed for Excellence
              </div>
            </div>
          </footer>
        </main>
      </div>
      
      {/* Click outside logic for bell dropdown (Simplified) */}
      {isBellOpen && (
         <div className="fixed inset-0 z-40" onClick={() => setIsBellOpen(false)}></div>
      )}
    </div>
  );
}
