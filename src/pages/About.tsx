import { Helmet } from 'react-helmet-async';
import { Info, Target, Eye, Heart, History as HistoryIcon, User, Edit2, Save, X, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
const logoImage = 'https://i.postimg.cc/SxGS5WxY/logo.png';

export default function About() {
  const [content, setContent] = useState({
    aboutUs: 'Established in the heart of Karjanha Municipality, Ward No. 05, Siraha, Shikshantar Academy is a distinguished educational institution committed to academic excellence and character development. From Playgroup through Class Ten, we cultivate an enriching environment that transforms students into confident, capable, and compassionate individuals.',
    mission: 'To deliver a transformative educational experience in a safe, progressive, and nurturing environment, empowering students to maximize their academic potential, embrace critical thinking, and emerge as responsible global citizens.',
    vision: 'To serve as a center of educational excellence across Madhesh Province and beyond, inspiring a lifelong passion for learning, unyielding creativity, and principled leadership in every student.',
    history: 'Founded with a profound vision to elevate the educational landscape of Siraha, Shikshantar Academy has steadily evolved into a prestigious institution of learning. Through our unwavering dedication to pedagogical excellence, we have consistently nurtured top-tier talent and secured our standing as a trusted partner for parents investing in their children\'s future.',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState(content);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const loadData = () => {
      const rawData = localStorage.getItem('school_about_v3');
      if (rawData) {
        setContent(JSON.parse(rawData));
        setTempContent(JSON.parse(rawData));
      }
    };
    
    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school_about_v3') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSave = () => {
    setContent(tempContent);
    localStorage.setItem('school_about_v3', JSON.stringify(tempContent));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempContent(content);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col max-w-6xl mx-auto pb-12">
      <Helmet>
        <title>About Us | Shikshantar Academy</title>
        <meta name="description" content="Learn about the history, mission, and vision of Shikshantar Academy, providing excellence in education in Siraha." />
        <link rel="canonical" href="https://shikshantaracademy.edu.np/about" />
      </Helmet>
      
      {isAdmin && (
        <div className="flex justify-end w-full mb-6">
          {isEditing ? (
            <div className="flex gap-3">
              <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md transition-all active:scale-95">
                <Save className="w-4 h-4"/> Save Content
              </button>
              <button onClick={handleCancel} className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-100 transition-all active:scale-95">
                <X className="w-4 h-4"/> Cancel
              </button>
            </div>
          ) : (
             <button onClick={() => setIsEditing(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-dark shadow-md transition-all active:scale-95">
                <Edit2 className="w-4 h-4"/> Edit Page Content
             </button>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 relative overflow-hidden mb-8 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none transition-opacity group-hover:opacity-100"></div>
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 bg-primary text-xs font-black tracking-widest mb-6 uppercase">
            <Info className="w-3.5 h-3.5" />
            About Our Institution
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight text-gray-900 mb-4 tracking-tight">
            Shikshantar Academy
          </h1>
          <p className="text-lg md:text-xl font-bold text-primary mb-8">
            Empowering Minds, Shaping Futures
          </p>
          
          {isEditing ? (
            <textarea 
              className="w-full text-base text-gray-700 leading-relaxed p-4 border-primary text-primary border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all resize-y min-h-[120px]"
              value={tempContent.aboutUs}
              onChange={(e) => setTempContent({...tempContent, aboutUs: e.target.value})}
            />
          ) : (
            <p className="text-base md:text-lg text-gray-600 leading-relaxed whitespace-pre-wrap max-w-3xl">
              {content.aboutUs}
            </p>
          )}
          
          <div className="mt-8 pt-8 border-t border-gray-100 flex items-center">
            <a
              href="https://maps.app.goo.gl/n3Y7iLB1fry5cqtX9"
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary-dark hover:shadow-lg transition-all active:scale-95"
            >
              <MapPin className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5" />
              Find Us on Map
            </a>
          </div>
        </div>
      </section>

      {/* Grid Layout for the rest */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Mission & Vision Column */}
        <div className="flex flex-col gap-8">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex-1 relative overflow-hidden group">
            <div className="w-12 h-12 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
               <Target className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-4">Our Mission</h2>
            {isEditing ? (
              <textarea 
                className="w-full text-sm text-gray-700 leading-relaxed p-3 border-primary text-primary border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all resize-y min-h-[100px]"
                value={tempContent.mission}
                onChange={(e) => setTempContent({...tempContent, mission: e.target.value})}
              />
            ) : (
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                {content.mission}
              </p>
            )}
          </section>

          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex-1 relative overflow-hidden group">
            <div className="w-12 h-12 bg-orange-50 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[var(--primary)] group-hover:text-white transition-all duration-300">
               <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-4">Our Vision</h2>
            {isEditing ? (
              <textarea 
                className="w-full text-sm text-gray-700 leading-relaxed p-3 border-primary text-primary border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all resize-y min-h-[100px]"
                value={tempContent.vision}
                onChange={(e) => setTempContent({...tempContent, vision: e.target.value})}
              />
            ) : (
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                {content.vision}
              </p>
            )}
          </section>
        </div>

        {/* History & Values Column */}
        <div className="md:col-span-1 lg:col-span-2 flex flex-col gap-8">
          
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                 <HistoryIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Brief History</h2>
            </div>
            
            {isEditing ? (
              <textarea 
                className="w-full text-sm text-gray-700 leading-relaxed p-4 border-primary text-primary border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all resize-y min-h-[120px]"
                value={tempContent.history}
                onChange={(e) => setTempContent({...tempContent, history: e.target.value})}
              />
            ) : (
              <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                {content.history}
              </p>
            )}
          </section>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
             <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                     <Heart className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Core Values</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  <div className="border-primary text-primary p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-1.5 flex items-center gap-2">Excellence</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Striving for the highest standards in academics and character.</p>
                  </div>
                  <div className="border-primary text-primary p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-1.5 flex items-center gap-2">Integrity</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Fostering honesty, ethical behavior, and accountability.</p>
                  </div>
                  <div className="border-primary text-primary p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-1.5 flex items-center gap-2">Respect</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Valuing diversity and treating everyone with dignity.</p>
                  </div>
                  <div className="border-primary text-primary p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-1.5 flex items-center gap-2">Innovation</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Embracing modern teaching methodologies and technology.</p>
                  </div>
                </div>
             </section>

             <section className="bg-primary text-white rounded-3xl p-8 shadow-lg flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none transition-opacity group-hover:opacity-100"></div>
                <div className="absolute -bottom-8 -right-8 opacity-5 transform rotate-[-20deg] scale-150 transition-transform duration-700 group-hover:scale-[1.6]">
                  <img src={logoImage} alt="" className="w-48 h-48 object-contain grayscale" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                      <span className="text-5xl text-blue-400 opacity-50 font-serif leading-none block h-6">"</span>
                      <blockquote className="text-lg md:text-xl font-medium italic mb-6 leading-relaxed relative z-10 text-blue-50 mt-2">
                        We are dedicated to shaping the leaders of tomorrow through rigorous and holistic education.
                      </blockquote>
                  </div>
                  <div>
                    <div className="h-1 w-12 text-primary rounded-full mb-4"></div>
                    <p className="font-black text-white text-base tracking-wide uppercase">Management Team</p>
                    <p className="text-sm text-blue-300 font-medium">Shikshantar Academy</p>
                  </div>
                </div>
             </section>
          </div>
          
        </div>
      </div>
    </div>
  );
}
