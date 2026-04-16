import { useState } from 'react';

export default function Gallery() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'batches'>('teachers');

  const teachers = [
    { id: 1, name: 'Mr. Pappu Jha', role: 'Principal', image: 'https://picsum.photos/seed/t1/400/500' },
    { id: 2, name: 'Mrs. Sharma', role: 'Science Teacher', image: 'https://picsum.photos/seed/t2/400/500' },
    { id: 3, name: 'Mr. Koirala', role: 'Math Teacher', image: 'https://picsum.photos/seed/t3/400/500' },
    { id: 4, name: 'Ms. Thapa', role: 'English Teacher', image: 'https://picsum.photos/seed/t4/400/500' },
    { id: 5, name: 'Mr. Yadav', role: 'Computer Teacher', image: 'https://picsum.photos/seed/t5/400/500' },
    { id: 6, name: 'Mrs. Rai', role: 'Social Studies', image: 'https://picsum.photos/seed/t6/400/500' },
  ];

  const batches = [
    { year: '2082 B.S', image: 'https://picsum.photos/seed/b82/800/600' },
    { year: '2081 B.S', image: 'https://picsum.photos/seed/b81/800/600' },
    { year: '2080 B.S', image: 'https://picsum.photos/seed/b80/800/600' },
    { year: '2079 B.S', image: 'https://picsum.photos/seed/b79/800/600' },
    { year: '2078 B.S', image: 'https://picsum.photos/seed/b78/800/600' },
    { year: '2077 B.S', image: 'https://picsum.photos/seed/b77/800/600' },
  ];

  return (
    <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
      <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
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
        </div>
      </div>

      {activeTab === 'teachers' && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="bg-[#f9fafb] p-2 rounded-lg text-center border border-[#e5e7eb]">
              <div className="aspect-square rounded overflow-hidden mb-2">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-[0.7rem] font-bold text-[#1f2937] truncate">{teacher.name}</h3>
              <p className="text-[0.6rem] text-[#6b7280] truncate">{teacher.role}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {batches.map((batch) => (
            <div key={batch.year} className="relative rounded-lg overflow-hidden border border-[#e5e7eb]">
              <div className="aspect-[4/3]">
                <img
                  src={batch.image}
                  alt={`Batch ${batch.year}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
                <h3 className="text-[0.75rem] font-bold text-white">Batch {batch.year}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
