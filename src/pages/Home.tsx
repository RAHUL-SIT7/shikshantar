import { ArrowRight, BookOpen, Users, Trophy, MapPin, Edit2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Home() {
  const logoUrl = "https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE";

  const [content, setContent] = useState({
    tagline1: 'Empowering Minds,',
    tagline2: 'Shaping Futures.',
    description: 'Shikshantar Academy provides quality education from class Play to Ten (10) in a peaceful and nurturing environment in Bastipur-5, Siraha.',
    principalMessage: 'At Shikshantar Academy, we believe in nurturing not just academic excellence, but character, creativity, and critical thinking. Our peaceful environment and modern facilities provide the perfect setting for your child to grow and thrive.',
    principalImage: 'https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-6/606350985_1458678509597899_5556893883060728495_n.jpg?stp=dst-jpegr_tt6&_nc_cat=111&ccb=1-7&_nc_sid=7b2446&_nc_ohc=m_oCBJKH1PAQ7kNvwFHICaV&_nc_oc=Adqp37uV9GBTxjM1lLxaSYRDJLA3D4dbwIzW3BtH1qc7FPelv8gvcU9fTo6gODYsgXs&_nc_zt=23&se=-1&_nc_ht=scontent-bom5-1.xx&_nc_gid=tefv8-2c7oqqmBE4rv5zEw&_nc_ss=7a3a8&oh=00_Af0lPjuB4VGfbK8BddJKfDrz0pJsBdnKGq510rZ6abFJ_g&oe=69E6AC42',
    announcement: '🌟 Welcome to the new Shikshantar Academy Portal! Term 1 Examinations starting from next week. 🌟',
    admissionsBadge: 'Admissions Open 2081 B.S.'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(content);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'home_content'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setContent(data);
        if(!isEditing) {
          setTempContent(data);
        }
      }
    });

    return () => unsub();
  }, [isEditing]);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'home_content'), tempContent);
      setContent(tempContent);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Error saving content. Make sure you are an admin.');
    }
  };

  const handleCancel = () => {
    setTempContent(content);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Global Scrolling Announcement */}
      {(content.announcement || isEditing) && (
        <div className={`w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl overflow-hidden flex flex-col md:flex-row shadow-sm relative ${isEditing ? 'p-2 gap-2' : 'items-center'}`}>
          <div className="bg-[#f97316] text-white text-xs font-bold px-4 py-2.5 uppercase tracking-wider relative z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)] whitespace-nowrap shrink-0 flex items-center gap-2 rounded-l-md md:rounded-none">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Notice
          </div>
          <div className="relative flex-1 overflow-hidden h-full flex items-center w-full">
            {isEditing ? (
              <div className="flex flex-col w-full px-2 py-1">
                <label className="text-[0.65rem] font-bold text-[#64748b] uppercase mb-1">Scrolling Notice (Leave empty to hide entirely)</label>
                <input
                  type="text"
                  placeholder="Type an announcement to show globally, or clear this text to hide the notice bar."
                  value={tempContent.announcement || ''}
                  onChange={(e) => setTempContent({...tempContent, announcement: e.target.value})}
                  className="w-full bg-white border-2 border-[#1e3a8a]/20 text-[#1e293b] rounded-lg focus:outline-none focus:border-[#1e3a8a] px-3 py-2 text-sm font-medium transition-colors"
                />
              </div>
            ) : (
                <div className="animate-marquee whitespace-nowrap text-[#1e293b] text-sm font-semibold pl-[100%] inline-block h-full flex items-center py-2.5">
                  {content.announcement}
                </div>
            )}
          </div>
        </div>
      )}

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
          {(!isEditing && content.admissionsBadge) ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold mb-6 border border-white/20 uppercase backdrop-blur-sm shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse"></span>
              {content.admissionsBadge}
            </div>
          ) : isEditing ? (
            <div className="mb-6 flex flex-col gap-1">
              <label className="text-[0.65rem] font-bold text-white/70 uppercase">Top Badge Text (Leave empty to hide)</label>
              <input
                type="text"
                placeholder="e.g. Admissions Open 2081 B.S."
                value={tempContent.admissionsBadge}
                onChange={(e) => setTempContent({...tempContent, admissionsBadge: e.target.value})}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold border border-white/30 uppercase backdrop-blur-sm shadow-sm outline-none w-fit"
              />
            </div>
          ) : null}
          
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
          <div 
            className="w-full md:w-64 h-56 shrink-0 rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-white bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setExpandedImage(content.principalImage)}
          >
            <img
              src={content.principalImage}
              alt="Principal Mr. Pappu Jha"
              className="w-full h-full object-cover object-[center_85%]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 w-full">
            {isEditing ? (
              <div className="flex flex-col gap-3 mb-4">
                <input 
                  type="text" 
                  placeholder="Principal Image URL"
                  value={tempContent.principalImage || ''}
                  onChange={(e) => setTempContent({...tempContent, principalImage: e.target.value})}
                  className="w-full text-sm p-3 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
                />
                <textarea 
                  className="w-full text-base text-[#1f2937] leading-relaxed p-3 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
                  rows={4}
                  value={tempContent.principalMessage}
                  onChange={(e) => setTempContent({...tempContent, principalMessage: e.target.value})}
                />
              </div>
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

      {/* Fullscreen Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/20 rounded-full p-2 transition-all"
            onClick={(e) => { e.stopPropagation(); setExpandedImage(null); }}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-[90vh] object-contain rounded drop-shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
