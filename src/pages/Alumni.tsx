import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Edit2, Save, X, Plus, Trash2, GraduationCap, Award, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

export default function Alumni() {
  const [alumni, setAlumni] = useState<{id: string, name: string, batch: string, currentStatus: string, description: string, imageUrl: string}[]>([]);
  const [tempAlumni, setTempAlumni] = useState<{id: string, name: string, batch: string, currentStatus: string, description: string, imageUrl: string}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'school_data', 'alumni'), (docSnap) => {
      if (docSnap.exists()) {
        const dbData = docSnap.data();
        if (dbData.items) {
          setAlumni(dbData.items);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'school_data/alumni'));
    
    return () => unsub();
  }, []);

  const handleEdit = () => {
    setTempAlumni(alumni.length > 0 ? alumni : [{ id: Date.now().toString(), name: '', batch: '', currentStatus: '', description: '', imageUrl: '' }]);
    setIsEditing(true);
  };

  const addAlumnus = () => {
    setTempAlumni([...tempAlumni, { id: Date.now().toString(), name: '', batch: '', currentStatus: '', description: '', imageUrl: '' }]);
  };

  const removeAlumnus = (id: string) => {
    setTempAlumni(tempAlumni.filter(a => a.id !== id));
  };

  const updateAlumnus = (id: string, field: string, value: string) => {
    setTempAlumni(tempAlumni.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validAlumni = tempAlumni.filter(a => a.name.trim() !== '');
      await setDoc(doc(db, 'school_data', 'alumni'), { items: validAlumni });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'school_data/alumni');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[#1e3a8a] flex items-center gap-3">
             <GraduationCap className="w-8 h-8 text-[#f97316]" /> 
             Alumni & Student Success
           </h1>
           <p className="text-gray-500 mt-2 max-w-2xl">Celebrating the achievements of our outstanding graduates who continue to make us proud across the globe.</p>
        </div>
        {isAdmin && !isEditing && (
          <button onClick={handleEdit} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shrink-0">
            <Edit2 className="w-4 h-4" /> Edit Alumni
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="space-y-8">
            {tempAlumni.map((alumnus, index) => (
              <div key={alumnus.id} className="p-6 border border-gray-200 rounded-xl relative bg-gray-50 group">
                <button onClick={() => removeAlumnus(alumnus.id)} className="absolute -top-3 -right-3 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="grid md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                     <input 
                       type="text" value={alumnus.name} onChange={e => updateAlumnus(alumnus.id, 'name', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Ram Sharma"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Batch / Year</label>
                     <input 
                       type="text" value={alumnus.batch} onChange={e => updateAlumnus(alumnus.id, 'batch', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Class of 2018"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Status / Role</label>
                     <input 
                       type="text" value={alumnus.currentStatus} onChange={e => updateAlumnus(alumnus.id, 'currentStatus', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Software Engineer at Google"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Image URL (Optional)</label>
                     <input 
                       type="text" value={alumnus.imageUrl} onChange={e => updateAlumnus(alumnus.id, 'imageUrl', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://..."
                     />
                   </div>
                   <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Short Description / Achievement</label>
                     <textarea 
                       value={alumnus.description} onChange={e => updateAlumnus(alumnus.id, 'description', e.target.value)} 
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={3}
                       placeholder="Describe their achievements..."
                     ></textarea>
                   </div>
                </div>
              </div>
            ))}

            <button onClick={addAlumnus} className="w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium">
              <Plus className="w-5 h-5" /> Add Log
            </button>
            
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button disabled={saving} onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Alumni'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alumni.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
               <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
               <p className="text-lg">No alumni records found.</p>
            </div>
          ) : (
            alumni.map((a, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={a.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="bg-blue-50 w-full h-full flex flex-col items-center justify-center text-blue-200">
                      <GraduationCap className="w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#f97316]" /> {a.batch}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">{a.name}</h3>
                  {a.currentStatus && (
                    <div className="flex items-start gap-2 text-blue-600 font-medium text-sm mb-4">
                      <Briefcase className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{a.currentStatus}</span>
                    </div>
                  )}
                  
                  <p className="text-gray-600 text-sm leading-relaxed mt-auto border-t border-gray-50 pt-4">
                    {a.description}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
