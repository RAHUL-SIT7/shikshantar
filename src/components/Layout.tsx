import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, Building, Image, Calendar, User, FileText, LogOut, LogIn, Info, Settings, Upload, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Layout({ isAuthenticated, setIsAuthenticated }: { isAuthenticated: boolean, setIsAuthenticated: (val: boolean) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const role = localStorage.getItem('userRole') || 'student';

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
  ];

  // Role specific navigation
  const getRoleNavigation = () => {
    let nav = [...baseNavigation];
    
    if (role === 'student') {
      nav.push({ name: 'Academic Result', href: '/result', icon: FileText });
      nav.push({ name: 'Account & Fees', href: '/account', icon: CreditCard });
    } else if (role === 'teacher') {
      nav.push({ name: 'Manage Results', href: '/admin', icon: Upload });
    } else if (role === 'admin') {
      nav.push({ name: 'Manage Results', href: '/admin', icon: Upload });
      nav.push({ name: 'Manage Accounts', href: '/account-admin', icon: Settings });
    }
    
    return nav;
  };

  const navigation = getRoleNavigation();

  return (
    <div className="h-screen w-full flex bg-[#f3f4f6] text-[#1f2937] overflow-hidden print:h-auto print:bg-white" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Sidebar Navigation */}
      <aside className="w-[220px] bg-[#1e3a8a] text-white flex-col py-5 hidden md:flex shrink-0 print:hidden">
        <div className="px-5 pb-[30px] text-center">
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

        <div className="flex-1 flex flex-col">
          <div className="px-5 text-[0.65rem] font-bold uppercase tracking-[1px] opacity-50 mb-2">Menu</div>
          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            <ul className="list-none p-0 m-0">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`px-6 py-3 text-[0.9rem] cursor-pointer flex items-center gap-3 transition-colors border-l-4 ${
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
              
              {isAuthenticated ? (
                <li className="mt-10">
                  <button
                    onClick={handleLogout}
                    className="w-full px-6 py-3 text-[0.9rem] cursor-pointer flex items-center gap-3 transition-colors border-l-4 border-transparent hover:bg-white/5 text-[#fca5a5]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout Session
                  </button>
                </li>
              ) : (
                <li className="mt-10">
                  <Link
                    to="/login"
                    className={`px-6 py-3 text-[0.9rem] cursor-pointer flex items-center gap-3 transition-colors border-l-4 ${
                      location.pathname === '/login' 
                        ? 'bg-white/10 border-[#f97316]' 
                        : 'border-transparent hover:bg-white/5'
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
        
        <div className="mt-auto p-5 border-t border-white/10">
          <div className="text-[0.7rem] opacity-60">Academic Year</div>
          <div className="text-[0.9rem] font-bold">2080 - 2081 B.S.</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Mobile Header */}
        <div className="md:hidden bg-[#1e3a8a] text-white p-4 flex justify-between items-center shrink-0 print:hidden">
          <div className="font-bold">SHIKSHANTAR</div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#1e3a8a] text-white absolute top-[60px] left-0 right-0 z-50 border-t border-white/10">
            <ul className="list-none p-0 m-0">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-6 py-3 text-[0.9rem] border-l-4 ${
                      location.pathname === item.href ? 'bg-white/10 border-[#f97316]' : 'border-transparent'
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              {isAuthenticated ? (
                <li>
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full text-left px-6 py-3 text-[0.9rem] text-[#fca5a5] border-l-4 border-transparent">Logout Session</button>
                </li>
              ) : (
                <li>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block px-6 py-3 text-[0.9rem] border-l-4 border-transparent">Login</Link>
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
                {isAuthenticated ? `Role: ${role.toUpperCase()}` : 'Guest'}
              </div>
              <div className="text-[0.7rem] text-[#6b7280]">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
