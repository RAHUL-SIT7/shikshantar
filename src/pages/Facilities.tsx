import { Activity, Edit2, Save, X, Plus, Trash2, Upload, Image as ImageIcon, Leaf } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

interface Facility {
  id: string;
  title: string;
  description: string;
  image: string;
}

const DEFAULT_FACILITIES: Facility[] = [
  {
    id: 'classroom',
    title: 'Smart Classes',
    description: 'Spacious, well-ventilated, and equipped with modern teaching aids. Our classrooms provide a vibrant atmosphere for modern learning.',
    image: 'https://picsum.photos/seed/classroom/800/600',
  },
  {
    id: 'computer-lab',
    title: 'Computer Lab',
    description: 'State-of-art computer lab for practical work and digital skills. Equipped with latest generation PCs and high-speed internet.',
    image: 'https://picsum.photos/seed/computer/800/600',
  },
  {
    id: 'project-lab',
    title: 'Project Lab',
    description: 'A dedicated workspace for students to build real-world projects, foster creativity and execute innovative ideas.',
    image: 'https://picsum.photos/seed/projectlab/800/600',
  },
  {
    id: 'playground',
    title: 'Sports & Playground',
    description: 'A large playground for various sports and physical activities. Promoting health, teamwork, and sportsmanship among students.',
    image: 'https://picsum.photos/seed/playground/800/600',
  },
];

export default function Facilities() {
  const [facilitiesText, setFacilitiesText] = useState('Our modern infrastructure is designed to provide students with the best possible environment for learning, growth, and extracurricular development.');
  const [facilitiesList, setFacilitiesList] = useState<Facility[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState('');
  const [tempFacilities, setTempFacilities] = useState<Facility[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'school_data', 'facilities'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFacilitiesText(data.description || 'Our modern infrastructure is designed to provide students with the best possible environment for learning, growth, and extracurricular development.');
        setFacilitiesList(data.items && data.items.length > 0 ? data.items : DEFAULT_FACILITIES);
      } else {
        setFacilitiesText('Our modern infrastructure is designed to provide students with the best possible environment for learning, growth, and extracurricular development.');
        setFacilitiesList(DEFAULT_FACILITIES);
      }
    });
    return () => unsub();
  }, []);

  const handleEditClick = () => {
    setTempText(facilitiesText);
    setTempFacilities(JSON.parse(JSON.stringify(facilitiesList))); // Deep copy
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'school_data', 'facilities'), {
        description: tempText,
        items: tempFacilities
      }, { merge: true });
      setIsEditing(false);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save changes.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleFacilityChange = (id: string, field: keyof Facility, value: string) => {
    setTempFacilities(tempFacilities.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleAddFacility = () => {
    const newFac: Facility = {
      id: `fac_${Date.now()}`,
      title: 'New Facility',
      description: 'Describe the short details about this new facility here.',
      image: 'https://via.placeholder.com/800x600.png?text=New+Facility'
    };
    setTempFacilities([newFac, ...tempFacilities]);
  };

  const handleDeleteFacility = (id: string) => {
    setTempFacilities(tempFacilities.filter(f => f.id !== id));
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(id);
    try {
      const storageRef = ref(storage, `facilities/${id}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleFacilityChange(id, 'image', url);
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 md:p-6 bg-gray-50 min-h-screen">
      {/* Header section with Edit controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div>
           <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#1e3a8a]" /> Infrastructure & Facilities
           </h1>
           <p className="text-sm text-gray-500 mt-1 font-medium">Explore the comprehensive amenities at Shikshantar Academy</p>
        </div>

        {isAdmin && (
          <div>
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={handleSave} className="bg-[#10b981] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#059669] shadow-sm transition-all focus:ring-2 focus:ring-[#10b981]/50">
                  <Save className="w-4 h-4"/> Save Changes
                </button>
                <button onClick={handleCancel} className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all">
                  <X className="w-4 h-4"/> Cancel
                </button>
              </div>
            ) : (
               <button onClick={handleEditClick} className="bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1e40af] shadow-sm transition-all focus:ring-2 focus:ring-[#1e3a8a]/50">
                  <Edit2 className="w-4 h-4"/> Edit Page Content
               </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-[#e5e7eb]">
        {/* Main Description */}
        <div className="mb-10">
          <h2 className="text-xl font-black text-gray-900 mb-4 border-b-2 border-gray-100 pb-3 uppercase tracking-wider text-[#1e3a8a]">Overview</h2>
          {isEditing ? (
            <textarea 
              className="w-full text-base text-[#1f2937] leading-relaxed p-4 border-2 border-blue-100 bg-blue-50/30 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner"
              rows={4}
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              placeholder="Enter the main overview describing the school's facilities..."
            />
          ) : (
            <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-5xl text-justify md:text-left font-medium">
              {facilitiesText}
            </p>
          )}
        </div>

        {/* Facilities Grid */}
        <div className="mb-6 flex justify-between items-end border-b-2 border-gray-100 pb-3">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-wider text-[#1e3a8a]">Featured Facilities</h2>
            {isEditing && (
                <button onClick={handleAddFacility} className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md transition-colors hover:bg-blue-100">
                    <Plus className="w-4 h-4" /> Add Facility
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {(isEditing ? tempFacilities : facilitiesList).map((facility) => (
              <motion.div 
                key={facility.id} 
                className={`group relative bg-white rounded-xl overflow-hidden border ${isEditing ? 'border-blue-200 shadow-md ring-2 ring-blue-50/50' : 'border-gray-200 shadow-sm hover:shadow-2xl hover:border-[#1e3a8a]/20'} transition-all duration-300 flex flex-col h-full hover:-translate-y-1`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
              >
                {/* Image Section - Much larger now (h-60) */}
                <div className="relative h-56 md:h-64 bg-gray-100 shrink-0 w-full overflow-hidden">
                  <img
                    src={facility.image}
                    alt={facility.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out cursor-pointer"
                    referrerPolicy="no-referrer"
                    onClick={() => !isEditing && setExpandedImage(facility.image)}
                  />
                  
                  {isEditing && (
                     <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                         <label className="bg-white text-gray-900 border border-gray-300 text-sm font-bold px-5 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 shadow-lg flex items-center gap-2 transform transition-transform hover:scale-105">
                             {uploadingId === facility.id ? (
                                <Activity className="w-5 h-5 animate-spin text-blue-600" />
                             ) : (
                                <Upload className="w-5 h-5 text-blue-600" />
                             )}
                             {uploadingId === facility.id ? 'Uploading Image...' : 'Upload New Image'}
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(facility.id, e)} />
                         </label>
                     </div>
                  )}

                  {!isEditing && (
                     <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md text-[#1e3a8a] p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 duration-300 z-10 cursor-pointer pointer-events-none">
                        <ImageIcon className="w-5 h-5" />
                     </div>
                  )}

                  {/* Gradient Overlay for better text readability and visual appeal */}
                  {!isEditing && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 flex-1 flex flex-col relative bg-white">
                  {isEditing ? (
                      <div className="flex flex-col gap-4 h-full">
                          <input 
                              type="text" 
                              value={facility.title} 
                              onChange={(e) => handleFacilityChange(facility.id, 'title', e.target.value)}
                              className="text-xl font-black text-gray-900 border-b-2 border-blue-200 focus:border-blue-600 outline-none pb-2 bg-transparent transition-colors placeholder:text-gray-300"
                              placeholder="Facility Title"
                          />
                          <textarea 
                              value={facility.description}
                              onChange={(e) => handleFacilityChange(facility.id, 'description', e.target.value)}
                              className="text-base text-gray-600 flex-1 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none resize-none bg-gray-50/50 min-h-[100px] transition-all"
                              placeholder="Describe this facility in detail..."
                          />
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-lg">
                             <span className="text-xs text-gray-400 font-mono bg-white px-2 py-1 rounded shadow-sm border border-gray-100">ID: {facility.id.substring(0, 12)}...</span>
                             <button onClick={() => handleDeleteFacility(facility.id)} className="text-red-600 hover:text-white bg-red-50 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors text-sm font-bold flex items-center gap-1 shadow-sm" title="Delete Facility">
                                 <Trash2 className="w-4 h-4" /> Remove
                             </button>
                          </div>
                      </div>
                  ) : (
                      <div className="relative z-10 flex flex-col h-full">
                          <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-[#1e3a8a] transition-colors">{facility.title}</h3>
                          <p className="text-base text-gray-600 leading-relaxed font-medium line-clamp-4 flex-1">
                              {facility.description}
                          </p>
                          <div className="w-12 h-1 bg-gradient-to-r from-[#1e3a8a] to-blue-300 rounded-full mt-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                  )}
                </div>
              </motion.div>
          ))}
        </div>

        {!isEditing && facilitiesList.length === 0 && (
           <div className="py-20 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300 mt-8">
               <Leaf className="w-16 h-16 mx-auto mb-4 opacity-20 text-blue-500" />
               <p className="text-lg font-medium text-gray-500">No facilities have been set up yet.</p>
               {isAdmin && (
                   <button onClick={handleEditClick} className="mt-4 text-blue-600 font-bold hover:underline">
                      Click here to start adding facilities
                   </button>
               )}
           </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-white bg-white/20 hover:bg-white/40 rounded-full p-3 transition-all backdrop-blur-md shadow-lg"
            onClick={(e) => { e.stopPropagation(); setExpandedImage(null); }}
          >
            <X className="w-7 h-7" />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded view" 
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg drop-shadow-2xl shadow-black ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
