import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Edit2, Save, X, Phone, Mail, MapPin, Globe, Facebook } from 'lucide-react';
import { motion } from 'motion/react';

export default function ContactUs() {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState({
    email: 'info@shikshantar.edu.np',
    phone: '+977-9807790805',
    address: 'Bastipur-5, Siraha',
    mapEmbedUrl: 'https://maps.google.com/maps?q=Bastipur-5,Siraha&t=&z=15&ie=UTF8&iwloc=&output=embed',
    googleMapsUrl: 'https://maps.app.goo.gl/rfH2jLU3cSJ5SNoB8',
    facebookUrl: '',
    websiteUrl: ''
  });
  const [tempData, setTempData] = useState(data);
  const [saving, setSaving] = useState(false);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'contact_us'), (docSnap) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        setData(prev => ({ ...prev, ...dbData }));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/contact_us'));

    return () => unsub();
  }, []);

  const handleEdit = () => {
    setTempData(data);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'contact_us'), tempData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/contact_us');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#1e3a8a]">Contact Us</h1>
        {isAdmin && !isEditing && (
          <button onClick={handleEdit} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={tempData.email} onChange={e => setTempData({...tempData, email: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={tempData.phone} onChange={e => setTempData({...tempData, phone: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={tempData.address} onChange={e => setTempData({...tempData, address: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={3}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL (Link)</label>
              <input type="url" value={tempData.googleMapsUrl || ''} onChange={e => setTempData({...tempData, googleMapsUrl: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://maps.app.goo.gl/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Map Embed URL (iframe src)</label>
              <input type="url" value={tempData.mapEmbedUrl} onChange={e => setTempData({...tempData, mapEmbedUrl: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://www.google.com/maps/embed?pb=..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Page URL</label>
              <input type="url" value={tempData.facebookUrl} onChange={e => setTempData({...tempData, facebookUrl: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input type="url" value={tempData.websiteUrl} onChange={e => setTempData({...tempData, websiteUrl: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button disabled={saving} onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="bg-blue-600 p-3 rounded-full text-white shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Visit Us</h3>
                  <p className="text-gray-600 mt-1 whitespace-pre-wrap">{data.address}</p>
                  {data.googleMapsUrl && (
                    <a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-semibold mt-2 inline-block">
                      Get Directions &rarr;
                    </a>
                  )}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                <div className="bg-green-600 p-3 rounded-full text-white shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Call Us</h3>
                  <p className="text-gray-600 mt-1">{data.phone}</p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-start gap-4 p-4 rounded-lg bg-purple-50 border border-purple-100">
                <div className="bg-purple-600 p-3 rounded-full text-white shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Email Us</h3>
                  <p className="text-gray-600 mt-1">{data.email}</p>
                </div>
              </motion.div>
              
              <div className="flex gap-4 pt-4">
                {data.facebookUrl && (
                  <a href={data.facebookUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-[#1877F2] text-white rounded-full hover:opacity-90 transition">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {data.websiteUrl && (
                  <a href={data.websiteUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-800 text-white rounded-full hover:opacity-90 transition">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            <div className="h-64 md:h-auto rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative">
              {data.mapEmbedUrl ? (
                <iframe 
                  src={data.mapEmbedUrl} 
                  className="absolute inset-0 w-full h-full border-0" 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 group overflow-hidden">
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 z-10"></div>
                    <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1470&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="School map unavailable" />
                  </div>
                  <div className="relative z-20 flex flex-col items-center p-6 text-center">
                    <div className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white mb-4 shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-bounce font-black">
                      <MapPin className="w-10 h-10" /> 
                    </div>
                    <span className="font-black text-white text-2xl drop-shadow-md">No Map Embed Available</span>
                    <p className="text-sm text-gray-200 mt-2 max-w-sm drop-shadow-sm font-medium">Get directions by clicking the button below, or add an embed URL in settings.</p>
                    {data.googleMapsUrl && (
                      <a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors font-bold shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Open in Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
