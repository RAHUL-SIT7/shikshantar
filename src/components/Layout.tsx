import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Building, Image, Calendar, User, FileText, LogOut, LogIn, Info, Settings, Upload, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Layout({ isAuthenticated, setIsAuthenticated }: { isAuthenticated: boolean, setIsAuthenticated: (val: boolean) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
  
  const role = localStorage.getItem('userRole') || 'student';
  
  const logoUrl = "https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getNPTDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate Academic Year based on current NPT Year and Month
  // Nepali New Year (Bysakh 1) typically falls in mid-April. 
  // For simplicity: If Gregorian month >= 4 (April), BS year = Gregorian + 57. Else + 56.
  const currentGregorianYear = currentTime.getFullYear();
  const currentGregorianMonth = currentTime.getMonth() + 1; // 1-12
  const currentGregorianDate = currentTime.getDate();

  let currentBSYear = currentGregorianYear + 56;
  // Baisakh roughly starts mid-April, approximate as April 13
  if (currentGregorianMonth > 4 || (currentGregorianMonth === 4 && currentGregorianDate >= 13)) {
    currentBSYear = currentGregorianYear + 57;
  }
  const academicYearString = `${currentBSYear}-${currentBSYear + 1} B.S.`;

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Base navigation for all roles
  const baseNavigation = [
    { name: 'Home Dashboard', href: '/', icon: Home },
    { name: 'About Us', href: '/about', icon: Info },
    { name: 'Facilities', href: '/facilities', icon: Building },
    { name: 'Photo Gallery', href: '/gallery', icon: Image },
    { name: 'Admission Form', href: '/admission', icon: FileText },
  ];

  // Role specific navigation
  const getRoleNavigation = () => {
    let nav = [...baseNavigation];
    
    if (!isAuthenticated) {
      nav.push({ name: 'Academic Result', href: '/login', icon: FileText });
      nav.push({ name: 'Account & Fees', href: '/login', icon: CreditCard });
      return nav;
    }

    if (role === 'student') {
      nav.push({ name: 'Academic Result', href: '/result', icon: FileText });
      nav.push({ name: 'Account & Fees', href: '/account', icon: CreditCard });
    } else if (role === 'teacher') {
      nav.push({ name: 'Manage Results', href: '/admin', icon: Upload });
    } else if (role === 'admin') {
      nav.push({ name: 'Manage Results', href: '/admin', icon: Upload });
      nav.push({ name: 'Manage Accounts', href: '/account-admin', icon: CreditCard });
      nav.push({ name: 'Admissions List', href: '/admin-admissions', icon: User });
    }
    
    return nav;
  };

  const navigation = getRoleNavigation();

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
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[0.8rem] font-bold truncate">
              {isAuthenticated ? `Logged in as ${role}` : 'Guest User'}
            </div>
            <div className="text-[0.65rem] opacity-70 truncate">
              {isAuthenticated ? 'Active Session' : 'Please login'}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 text-[0.65rem] font-bold uppercase tracking-[1px] opacity-50 mb-2 shrink-0">Menu</div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
            <ul className="list-none p-0 m-0 pb-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
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
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#1e3a8a] text-white absolute top-[72px] left-0 right-0 z-50 border-t border-white/10 shadow-xl overflow-y-auto max-h-[calc(100vh-72px)] pb-6">
            <div className="px-6 py-4 flex items-center gap-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[0.85rem] font-bold truncate">
                  {isAuthenticated ? `Logged in as ${role}` : 'Guest User'}
                </div>
                <div className="text-[0.7rem] opacity-70 truncate">
                  {isAuthenticated ? 'Active Session' : 'Please login'}
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
        <header className="bg-white p-5 flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.05)] shrink-0 z-10 hidden md:flex print:hidden">
          <div className="text-[1.2rem] font-bold text-[#1f2937]">
            {navigation.find(n => n.href === location.pathname)?.name || 'Portal'}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[0.8rem] font-bold text-[#1f2937]">
                {isAuthenticated ? `Role: ${role.toUpperCase()}` : 'Guest User'}
              </div>
              <div className="text-[0.7rem] text-[#6b7280] font-mono">
                {currentTime.toLocaleDateString('ne-NP', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} • {currentTime.toLocaleTimeString('ne-NP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center border border-[#e5e7eb]">
              <User className="w-5 h-5 text-[#6b7280]" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar print:overflow-visible print:p-0">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
