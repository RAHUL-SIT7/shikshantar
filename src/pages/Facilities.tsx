import { Monitor, BookOpen, Camera, Leaf, FlaskConical, Activity, Edit2, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Facilities() {
  const [facilitiesText, setFacilitiesText] = useState('Our modern infrastructure is designed to provide students with the best possible environment for learning and growth.');
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(facilitiesText);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const loadData = () => {
      const stored = localStorage.getItem('school_facilities_v2');
      if (stored) {
        setFacilitiesText(stored);
        setTempText(stored);
      }
    };
    
    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school_facilities_v2') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSave = () => {
    setFacilitiesText(tempText);
    localStorage.setItem('school_facilities_v2', tempText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempText(facilitiesText);
    setIsEditing(false);
  };

  const facilities = [
    {
      id: 'classroom',
      title: 'Smart Classes',
      description: 'Spacious, well-ventilated, and equipped with modern teaching aids.',
      icon: BookOpen,
      image: 'https://picsum.photos/seed/classroom/800/600',
    },
    {
      id: 'computer-lab',
      title: 'Computer Lab',
      description: 'State-of-art computer lab for practical work and digital skills.',
      icon: Monitor,
      image: 'https://picsum.photos/seed/computer/800/600',
    },
    {
      id: 'project-lab',
      title: 'Project Lab',
      description: 'A dedicated workspace for students to build real-world projects.',
      icon: Edit2,
      image: 'https://picsum.photos/seed/projectlab/800/600',
    },
    {
      id: 'playground',
      title: 'Playground',
      description: 'A large playground for various sports and physical activities.',
      icon: Activity,
      image: 'https://picsum.photos/seed/playground/800/600',
    },
    {
      id: 'cctv',
      title: 'CCTV Setup',
      description: '24/7 CCTV monitoring across the campus ensuring safety.',
      icon: Camera,
      image: 'https://picsum.photos/seed/cctv/800/600',
    },
    {
      id: 'environment',
      title: 'Environment',
      description: 'Located away from city noise, providing a serene atmosphere.',
      icon: Leaf,
      image: 'https://picsum.photos/seed/peaceful/800/600',
    },
    {
      id: 'science-lab',
      title: 'Science Lab',
      description: 'Fully equipped laboratory for practical science subjects.',
      icon: FlaskConical,
      image: 'https://picsum.photos/seed/sciencelab/800/600',
    },
  ];

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

      <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] relative">


      <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between">
        <span>Infrastructure & Facilities</span>
      </div>

      <div className="mb-6 w-full md:w-3/4">
        {isEditing ? (
          <textarea 
            className="w-full text-[0.8rem] text-[#1f2937] leading-relaxed p-3 border border-[#cbd5e1] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none"
            rows={4}
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
          />
        ) : (
          <p className="text-[0.8rem] text-[#1f2937] leading-relaxed whitespace-pre-wrap">
            {facilitiesText}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {facilities.map((facility) => {
          const Icon = facility.icon;
          return (
            <div 
              key={facility.id} 
              onClick={() => setExpandedImage(facility.image)}
              className="bg-[#f9fafb] p-3 rounded-lg text-center border border-[#e5e7eb] cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="h-24 bg-[#e2e8f0] rounded overflow-hidden mb-2 relative flex items-center justify-center">
                <img
                  src={facility.image}
                  alt={facility.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="relative z-10 bg-white/80 p-1.5 rounded shadow-sm">
                  <Icon className="h-4 w-4 text-[#1e3a8a]" />
                </div>
              </div>
              <h3 className="text-[0.75rem] font-bold text-[#1f2937] mb-1">{facility.title}</h3>
              <p className="text-[0.65rem] text-[#6b7280] leading-tight">
                {facility.description}
              </p>
            </div>
          );
        })}
      </div>
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
            alt="Expanded facility view" 
            className="max-w-full max-h-[90vh] object-contain rounded drop-shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
