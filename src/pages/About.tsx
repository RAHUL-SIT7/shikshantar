import { Info, Target, Eye, Heart, History as HistoryIcon, User, Edit2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function About() {
  const [content, setContent] = useState({
    aboutUs: 'Located in the heart of Bastipur-5, Siraha, Madhesh Province, Nepal, Shikshantar Academy is a premier educational institution dedicated to providing quality education from Playgroup to Class Ten (10). We foster an environment where academic excellence meets character building.',
    mission: 'To provide a nurturing, safe, and innovative learning environment that empowers students to reach their full potential, develop critical thinking skills, and become responsible global citizens.',
    vision: 'To be a center of excellence in education that inspires lifelong learning, creativity, and leadership among students in the Madhesh Province and beyond.',
    history: 'Established with a vision to transform the educational landscape of Siraha, Shikshantar Academy has grown from a modest beginning into a leading institution. Over the years, we have consistently produced outstanding academic results and nurtured talents across various disciplines, becoming a trusted name for parents in the region.',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(content);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const loadData = () => {
      const rawData = localStorage.getItem('school_about_v2');
      if (rawData) {
        setContent(JSON.parse(rawData));
        setTempContent(JSON.parse(rawData));
      }
    };
    
    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school_about_v2') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSave = () => {
    setContent(tempContent);
    localStorage.setItem('school_about_v2', JSON.stringify(tempContent));
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

      <section className="col-span-1 md:col-span-3 bg-[#ffffff] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold mb-4 border border-[#1e3a8a]/20 uppercase">
            <Info className="w-3 h-3" />
            About Us
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2 text-[#1f2937]">
            Shikshantar Academy
          </h1>
          <p className="text-sm font-bold text-[#f97316] uppercase tracking-wider mb-4">
            "Empowering Minds, Shaping Futures"
          </p>
          {isEditing ? (
            <textarea 
              className="w-full text-sm text-[#6b7280] leading-relaxed p-3 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
              rows={4}
              value={tempContent.aboutUs}
              onChange={(e) => setTempContent({...tempContent, aboutUs: e.target.value})}
            />
          ) : (
            <p className="text-sm text-[#6b7280] max-w-3xl leading-relaxed whitespace-pre-wrap">
              {content.aboutUs}
            </p>
          )}
        </div>
      </section>

      {/* Mission & Vision */}
      <div className="col-span-1 flex flex-col gap-5">
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex-1">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1e3a8a]" />
            Our Mission
          </div>
          {isEditing ? (
            <textarea 
              className="w-full text-[0.8rem] text-[#1f2937] leading-relaxed p-2 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
              rows={4}
              value={tempContent.mission}
              onChange={(e) => setTempContent({...tempContent, mission: e.target.value})}
            />
          ) : (
            <p className="text-[0.8rem] text-[#1f2937] leading-relaxed">
              {content.mission}
            </p>
          )}
        </section>

        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex-1">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#1e3a8a]" />
            Our Vision
          </div>
          {isEditing ? (
            <textarea 
              className="w-full text-[0.8rem] text-[#1f2937] leading-relaxed p-2 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
              rows={4}
              value={tempContent.vision}
              onChange={(e) => setTempContent({...tempContent, vision: e.target.value})}
            />
          ) : (
            <p className="text-[0.8rem] text-[#1f2937] leading-relaxed">
              {content.vision}
            </p>
          )}
        </section>
      </div>

      {/* Values & History */}
      <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#1e3a8a]" />
            Core Values
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb]">
              <h4 className="text-[0.8rem] font-bold text-[#1f2937] mb-1">Excellence</h4>
              <p className="text-[0.7rem] text-[#6b7280]">Striving for the highest standards in academics and character.</p>
            </div>
            <div className="bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb]">
              <h4 className="text-[0.8rem] font-bold text-[#1f2937] mb-1">Integrity</h4>
              <p className="text-[0.7rem] text-[#6b7280]">Fostering honesty, ethical behavior, and accountability.</p>
            </div>
            <div className="bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb]">
              <h4 className="text-[0.8rem] font-bold text-[#1f2937] mb-1">Respect</h4>
              <p className="text-[0.7rem] text-[#6b7280]">Valuing diversity and treating everyone with dignity.</p>
            </div>
            <div className="bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb]">
              <h4 className="text-[0.8rem] font-bold text-[#1f2937] mb-1">Innovation</h4>
              <p className="text-[0.7rem] text-[#6b7280]">Embracing modern teaching methodologies and technology.</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
            <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-[#1e3a8a]" />
              Brief History
            </div>
            {isEditing ? (
              <textarea 
                className="w-full text-[0.8rem] text-[#1f2937] leading-relaxed p-2 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
                rows={6}
                value={tempContent.history}
                onChange={(e) => setTempContent({...tempContent, history: e.target.value})}
              />
            ) : (
              <p className="text-[0.8rem] text-[#1f2937] leading-relaxed whitespace-pre-wrap">
                {content.history}
              </p>
            )}
          </section>

          <section className="bg-[#1e293b] text-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
              <User className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <blockquote className="text-sm italic mb-4 leading-relaxed relative">
                <span className="text-3xl text-white/20 absolute -top-3 -left-3 font-serif">"</span>
                We are dedicated to shaping the leaders of tomorrow through holistic education.
                <span className="text-3xl text-white/20 absolute -bottom-5 font-serif">"</span>
              </blockquote>
              <div className="mt-4">
                <p className="font-extrabold text-white text-sm">Management Team</p>
                <p className="text-xs text-[#f97316] font-medium">Shikshantar Academy</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    </div>
  );
}
