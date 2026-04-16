import { Info, Target, Eye, Heart, History, User } from 'lucide-react';

export default function About() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Header / Motto - span 3 */}
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
          <p className="text-sm text-[#6b7280] max-w-3xl leading-relaxed">
            Located in the heart of Bastipur-5, Siraha, Madhesh Province, Nepal, Shikshantar Academy is a premier educational institution dedicated to providing quality education from Playgroup to Class Ten (10). We foster an environment where academic excellence meets character building.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <div className="col-span-1 flex flex-col gap-5">
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex-1">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1e3a8a]" />
            Our Mission
          </div>
          <p className="text-[0.8rem] text-[#1f2937] leading-relaxed">
            To provide a nurturing, safe, and innovative learning environment that empowers students to reach their full potential, develop critical thinking skills, and become responsible global citizens.
          </p>
        </section>

        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb] flex-1">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#1e3a8a]" />
            Our Vision
          </div>
          <p className="text-[0.8rem] text-[#1f2937] leading-relaxed">
            To be a center of excellence in education that inspires lifelong learning, creativity, and leadership among students in the Madhesh Province and beyond.
          </p>
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
              <History className="w-4 h-4 text-[#1e3a8a]" />
              Brief History
            </div>
            <p className="text-[0.8rem] text-[#1f2937] leading-relaxed">
              Established with a vision to transform the educational landscape of Siraha, Shikshantar Academy has grown from a modest beginning into a leading institution. Over the years, we have consistently produced outstanding academic results and nurtured talents across various disciplines, becoming a trusted name for parents in the region.
            </p>
          </section>

          <section className="bg-[#1e293b] text-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
              <User className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="text-[0.75rem] font-bold uppercase text-white/60 mb-2">Leadership</div>
              <h3 className="text-xl font-bold mb-1">Mr. Pappu Jha</h3>
              <p className="text-[0.8rem] text-[#f97316] font-semibold mb-3">Principal</p>
              <p className="text-[0.75rem] text-white/80 italic leading-relaxed">
                "Education is not just about academic success; it is about building character, instilling values, and preparing our youth to face the challenges of tomorrow with confidence and integrity."
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
