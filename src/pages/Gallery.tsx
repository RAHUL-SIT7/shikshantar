import { useState, useEffect } from 'react';

export default function Gallery() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'batches' | 'events'>('teachers');

  const [teachers, setTeachers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const storedGallery = localStorage.getItem('school_gallery');
    if (storedGallery) {
      const data = JSON.parse(storedGallery);
      setTeachers(data.teachers || []);
      setBatches(data.batches || []);
      setEvents(data.events || []);
    } else {
      // Default Data
      setTeachers([
        { id: 1, name: 'Mr. Pappu Jha', role: 'Principal', image: 'https://picsum.photos/seed/t1/400/500' },
        { id: 2, name: 'Mrs. Sharma', role: 'Science Teacher', image: 'https://picsum.photos/seed/t2/400/500' },
        { id: 3, name: 'Mr. Koirala', role: 'Math Teacher', image: 'https://picsum.photos/seed/t3/400/500' },
        { id: 4, name: 'Ms. Thapa', role: 'English Teacher', image: 'https://picsum.photos/seed/t4/400/500' },
      ]);
      setBatches([
        { year: '2082 B.S', image: 'https://picsum.photos/seed/b82/800/600' },
        { year: '2081 B.S', image: 'https://picsum.photos/seed/b81/800/600' },
      ]);
      setEvents([
        { title: 'Annual Sports Day', image: 'https://picsum.photos/seed/e1/800/600' },
        { title: 'Science Exhibition', image: 'https://picsum.photos/seed/e2/800/600' },
      ]);
    }
  }, []);

  return (
    <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
      <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <span>Photo Gallery</span>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-1 text-xs rounded border ${
              activeTab === 'teachers'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-3 py-1 text-xs rounded border ${
              activeTab === 'batches'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
            }`}
          >
            Batches
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1 text-xs rounded border ${
              activeTab === 'events'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
            }`}
          >
            Events
          </button>
        </div>
      </div>

      {activeTab === 'teachers' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {teachers.map((teacher, idx) => (
            <div key={teacher.id || idx} className="bg-[#f9fafb] p-2 rounded-lg text-center border border-[#e5e7eb]">
              <div className="aspect-square rounded overflow-hidden mb-2">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-[0.7rem] font-bold text-[#1f2937] truncate">{teacher.name}</h3>
              <p className="text-[0.6rem] text-[#6b7280] truncate">{teacher.role}</p>
            </div>
          ))}
          {teachers.length === 0 && <p className="text-xs text-gray-500 col-span-full">No staff photos uploaded yet.</p>}
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {batches.map((batch, idx) => (
            <div key={batch.year || idx} className="relative rounded-lg overflow-hidden border border-[#e5e7eb]">
              <div className="aspect-[4/3]">
                <img
                  src={batch.image}
                  alt={`Batch ${batch.year}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
                <h3 className="text-[0.75rem] font-bold text-white">{batch.year}</h3>
              </div>
            </div>
          ))}
          {batches.length === 0 && <p className="text-xs text-gray-500 col-span-full">No batch photos uploaded yet.</p>}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {events.map((event, idx) => (
            <div key={event.title || idx} className="relative rounded-lg overflow-hidden border border-[#e5e7eb]">
              <div className="aspect-[4/3]">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
                <h3 className="text-[0.75rem] font-bold text-white">{event.title}</h3>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-xs text-gray-500 col-span-full">No event photos uploaded yet.</p>}
        </div>
      )}
    </div>
  );
}
