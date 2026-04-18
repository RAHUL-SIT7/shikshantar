import { ArrowRight, BookOpen, Users, Trophy, MapPin, Edit2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Home() {
  const logoUrl = "https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE";

  const [content, setContent] = useState({
    tagline1: 'Empowering Minds,',
    tagline2: 'Shaping Futures.',
    description: 'Shikshantar Academy provides quality education from class Play to Ten (10) in a peaceful and nurturing environment in Bastipur-5, Siraha.',
    principalMessage: 'At Shikshantar Academy, we believe in nurturing not just academic excellence, but character, creativity, and critical thinking. Our peaceful environment and modern facilities provide the perfect setting for your child to grow and thrive.'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(content);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const loadData = () => {
      const rawData = localStorage.getItem('school_home_content');
      if (rawData) {
        setContent(JSON.parse(rawData));
        setTempContent(JSON.parse(rawData));
      }
    };
    
    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school_home_content') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSave = () => {
    setContent(tempContent);
    localStorage.setItem('school_home_content', JSON.stringify(tempContent));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempContent(content);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex justify-end w-full">
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-[#10b981] text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-[#059669] shadow">
                <Save className="w-4 h-4"/> Save Editing
              </button>
              <button onClick={handleCancel} className="bg-[#ef4444] text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-[#b91c1c] shadow">
                <X className="w-4 h-4"/> Cancel
              </button>
            </div>
          ) : (
             <button onClick={() => setIsEditing(true)} className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-[#1e40af] shadow">
                <Edit2 className="w-4 h-4"/> Edit Page Content
             </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
        {/* Hero Section - span 3 */}
      <section className="col-span-1 md:col-span-3 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] rounded-xl p-8 shadow-lg border border-[#1e3a8a]/20 relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay flex items-center justify-center pointer-events-none">
          <img
            src={logoUrl}
            alt="School Logo"
            className="w-full h-full object-contain p-10 max-w-2xl blur-[1px]"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#f97316] rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold mb-6 border border-white/20 uppercase backdrop-blur-sm shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse"></span>
            Admissions Open 2081 B.S.
          </div>
          
          {isEditing ? (
            <div className="mb-4 flex flex-col gap-2">
              <input 
                type="text" 
                value={tempContent.tagline1} 
                onChange={(e) => setTempContent({...tempContent, tagline1: e.target.value})}
                className="w-full text-2xl font-bold bg-white/20 border border-white/30 rounded px-3 py-1 outline-none text-white focus:bg-white/30"
              />
              <input 
                type="text" 
                value={tempContent.tagline2} 
                onChange={(e) => setTempContent({...tempContent, tagline2: e.target.value})}
                className="w-full text-2xl font-bold text-[#f97316] bg-white/20 border border-white/30 rounded px-3 py-1 outline-none focus:bg-white/30"
              />
              <textarea 
                rows={3}
                value={tempContent.description} 
                onChange={(e) => setTempContent({...tempContent, description: e.target.value})}
                className="w-full text-sm bg-white/20 border border-white/30 rounded px-3 py-2 outline-none text-white focus:bg-white/30 mt-2"
              />
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 tracking-tight">
                {content.tagline1} <span className="text-[#f97316]">{content.tagline2}</span>
              </h1>
              <p className="text-sm md:text-base text-blue-100 mb-8 max-w-2xl leading-relaxed whitespace-pre-wrap">
                {content.description}
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-4 mt-8">
            <Link
              to="/facilities"
              className="bg-[#f97316] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#ea580c] transition-colors shadow-md"
            >
              Explore Facilities
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://maps.app.goo.gl/N8qC6agZMjcUy63q6"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              <MapPin className="h-4 w-4" />
              Find Us
            </a>
          </div>
        </div>
      </section>

      {/* Stats/Features */}
      <div className="bg-[#ffffff] rounded-xl p-5 shadow-md border border-[#e5e7eb] flex flex-col items-center text-center hover:shadow-lg transition-shadow">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 w-full text-left tracking-wider">Feature</div>
        <div className="w-12 h-12 bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] text-[#0369a1] rounded-full flex items-center justify-center mb-4 shadow-sm">
          <BookOpen className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-[#1f2937] mb-2">Quality Education</h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">Comprehensive curriculum from Playgroup to Class 10.</p>
      </div>

      <div className="bg-[#ffffff] rounded-xl p-5 shadow-md border border-[#e5e7eb] flex flex-col items-center text-center hover:shadow-lg transition-shadow">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 w-full text-left tracking-wider">Faculty</div>
        <div className="w-12 h-12 bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] text-[#0369a1] rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-[#1f2937] mb-2">Expert Faculty</h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">Led by Principal Mr. Pappu Jha & dedicated educators.</p>
      </div>

      <div className="bg-[#ffffff] rounded-xl p-5 shadow-md border border-[#e5e7eb] flex flex-col items-center text-center hover:shadow-lg transition-shadow">
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 w-full text-left tracking-wider">Achievement</div>
        <div className="w-12 h-12 bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] text-[#0369a1] rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Trophy className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-[#1f2937] mb-2">Excellent Results</h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">Consistent track record of outstanding achievements.</p>
      </div>

      {/* Message from Principal */}
      <section className="col-span-1 md:col-span-3 bg-[#ffffff] rounded-xl p-6 shadow-md border border-[#e5e7eb] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#1e3a8a] to-[#f97316]"></div>
        <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-6 tracking-wider">Message from the Principal</div>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="w-28 h-28 shrink-0 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <img
              src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-6/606350985_1458678509597899_5556893883060728495_n.jpg?stp=dst-jpegr_tt6&_nc_cat=111&ccb=1-7&_nc_sid=7b2446&_nc_ohc=m_oCBJKH1PAQ7kNvwFHICaV&_nc_oc=Adqp37uV9GBTxjM1lLxaSYRDJLA3D4dbwIzW3BtH1qc7FPelv8gvcU9fTo6gODYsgXs&_nc_zt=23&se=-1&_nc_ht=scontent-bom5-1.xx&_nc_gid=tefv8-2c7oqqmBE4rv5zEw&_nc_ss=7a3a8&oh=00_Af0lPjuB4VGfbK8BddJKfDrz0pJsBdnKGq510rZ6abFJ_g&oe=69E6AC42"
              alt="Principal Mr. Pappu Jha"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 w-full">
            {isEditing ? (
              <textarea 
                className="w-full text-base text-[#1f2937] leading-relaxed p-3 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none mb-4"
                rows={4}
                value={tempContent.principalMessage}
                onChange={(e) => setTempContent({...tempContent, principalMessage: e.target.value})}
              />
            ) : (
              <blockquote className="text-base text-[#1f2937] italic mb-4 leading-relaxed relative whitespace-pre-wrap">
                <span className="text-4xl text-[#e5e7eb] absolute -top-4 -left-4 font-serif">"</span>
                {content.principalMessage}
                <span className="text-4xl text-[#e5e7eb] absolute -bottom-6 font-serif">"</span>
              </blockquote>
            )}
            <div className="mt-6">
              <p className="font-extrabold text-[#1f2937] text-base">Mr. Pappu Jha</p>
              <p className="text-sm text-[#f97316] font-medium">Principal, Shikshantar Academy</p>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
