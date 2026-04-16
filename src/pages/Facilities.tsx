import { Monitor, BookOpen, Camera, Leaf, FlaskConical, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Facilities() {
  const [facilitiesText, setFacilitiesText] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('school_facilities');
    if (stored) setFacilitiesText(stored);
  }, []);

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
      title: 'Digital Lab',
      description: 'State-of-art computer lab for practical lab work and digital skills.',
      icon: Monitor,
      image: 'https://picsum.photos/seed/computerlab/800/600',
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
    <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
      <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between">
        <span>Infrastructure & Facilities</span>
      </div>

      {facilitiesText && (
        <div className="mb-5 text-[0.8rem] text-[#1f2937] leading-relaxed whitespace-pre-wrap">
          {facilitiesText}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {facilities.map((facility) => {
          const Icon = facility.icon;
          return (
            <div key={facility.id} className="bg-[#f9fafb] p-3 rounded-lg text-center border border-[#e5e7eb]">
              <div className="h-20 bg-[#e2e8f0] rounded overflow-hidden mb-2 relative flex items-center justify-center">
                <img
                  src={facility.image}
                  alt={facility.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="relative z-10 bg-white/80 p-1.5 rounded">
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
  );
}
