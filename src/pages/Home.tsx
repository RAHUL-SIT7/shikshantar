import { ArrowRight, BookOpen, Users, Trophy, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Hero Section - span 3 */}
      <section className="col-span-1 md:col-span-3 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] rounded-xl p-8 shadow-lg border border-[#1e3a8a]/20 relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
          <img
            src="https://picsum.photos/seed/school-building/1920/1080?blur=2"
            alt="School Building"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#f97316] rounded-full blur-3xl opacity-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold mb-6 border border-white/20 uppercase backdrop-blur-sm shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse"></span>
            Admissions Open 2081 B.S.
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 tracking-tight">
            Empowering Minds, <span className="text-[#f97316]">Shaping Futures.</span>
          </h1>
          <p className="text-sm md:text-base text-blue-100 mb-8 max-w-2xl leading-relaxed">
            Shikshantar Academy provides quality education from class Play to Ten (10) in a peaceful and nurturing environment in Bastipur-5, Siraha.
          </p>
          <div className="flex flex-wrap gap-4">
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
          <div className="flex-1">
            <blockquote className="text-base text-[#1f2937] italic mb-4 leading-relaxed relative">
              <span className="text-4xl text-[#e5e7eb] absolute -top-4 -left-4 font-serif">"</span>
              At Shikshantar Academy, we believe in nurturing not just academic excellence, but character, creativity, and critical thinking. Our peaceful environment and modern facilities provide the perfect setting for your child to grow and thrive.
              <span className="text-4xl text-[#e5e7eb] absolute -bottom-6 font-serif">"</span>
            </blockquote>
            <div className="mt-6">
              <p className="font-extrabold text-[#1f2937] text-base">Mr. Pappu Jha</p>
              <p className="text-sm text-[#f97316] font-medium">Principal, Shikshantar Academy</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
