import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, Trash2, CheckCircle, Circle, X } from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Gallery() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'batches' | 'events'>('teachers');

  const [teachers, setTeachers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [newImage, setNewImage] = useState({ url: '', caption: '', role: '' });
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [galleryStatus, setGalleryStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  
  const userRole = localStorage.getItem('userRole');
  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'school_data', 'gallery'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTeachers(data.teachers || []);
        setBatches(data.batches || []);
        setEvents(data.events || []);
      } else {
        // Init default if doesn't exist
        const defaultData = {
          teachers: [
            { id: 1, name: 'Mr. Pappu Jha', role: 'Principal', image: 'https://picsum.photos/seed/t1/400/500' },
            { id: 2, name: 'Mrs. Sharma', role: 'Science Teacher', image: 'https://picsum.photos/seed/t2/400/500' },
            { id: 3, name: 'Mr. Koirala', role: 'Math Teacher', image: 'https://picsum.photos/seed/t3/400/500' },
            { id: 4, name: 'Ms. Thapa', role: 'English Teacher', image: 'https://picsum.photos/seed/t4/400/500' },
          ],
          batches: [
            { year: '2082 B.S', image: 'https://picsum.photos/seed/b82/800/600' },
            { year: '2081 B.S', image: 'https://picsum.photos/seed/b81/800/600' },
          ],
          events: [
            { title: 'Annual Sports Day', image: 'https://picsum.photos/seed/e1/800/600' },
            { title: 'Science Exhibition', image: 'https://picsum.photos/seed/e2/800/600' },
          ]
        };
        setDoc(doc(db, 'school_data', 'gallery'), defaultData).catch(console.error);
      }
    });

    return () => unsub();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage({ ...newImage, url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddImage = async () => {
    if (!newImage.url || !newImage.caption) {
      setGalleryStatus('Please provide both Image and Caption.');
      return;
    }

    setIsUploading(true);
    setGalleryStatus('Saving image to Database...');
    
    // We are deliberately bypassing Firebase Storage and saving the Base64 string from newImage.url directly into the Firestore database document to avoid billing requirements.
    const finalImageUrl = newImage.url;
    
    const updatedGallery = { teachers, batches, events };
    
    if (activeTab === 'teachers') {
      const updated = [...teachers, { id: Date.now(), name: newImage.caption, role: newImage.role || 'Staff', image: finalImageUrl }];
      setTeachers(updated);
      updatedGallery.teachers = updated;
    } else if (activeTab === 'batches') {
      const updated = [...batches, { year: newImage.caption, image: finalImageUrl }];
      setBatches(updated);
      updatedGallery.batches = updated;
    } else if (activeTab === 'events') {
      const updated = [...events, { title: newImage.caption, image: finalImageUrl }];
      setEvents(updated);
      updatedGallery.events = updated;
    }

    try {
      await setDoc(doc(db, 'school_data', 'gallery'), updatedGallery);
      setNewImage({ url: '', caption: '', role: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setGalleryStatus('Image successfully added to gallery!');
    } catch (e) {
      console.error(e);
      setGalleryStatus('Failed to upload image. Image size might be too large for free database.');
    }
    
    setIsUploading(false);
    setTimeout(() => setGalleryStatus(''), 4000);
  };

  const handleClearGalleryCategory = async () => {
    if (window.confirm(`Clear all ${activeTab}?`)) {
      try {
        await updateDoc(doc(db, 'school_data', 'gallery'), {
          [activeTab]: []
        });
        setSelectedIndexes([]);
        setIsDeleteMode(false);
      } catch (e) {
        console.error(e);
        alert('Error clearing category: ' + e);
      }
    }
  };

  const isSelected = (index: number) => {
    return selectedIndexes.includes(index);
  };

  const toggleSelection = (index: number) => {
    if (isSelected(index)) {
      setSelectedIndexes(selectedIndexes.filter(i => i !== index));
    } else {
      setSelectedIndexes([...selectedIndexes, index]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIndexes.length === 0) return;
    if (!window.confirm(`Delete ${selectedIndexes.length} selected items?`)) return;

    let updatedArray: any[] = [];
    if (activeTab === 'teachers') {
      updatedArray = teachers.filter((_, idx) => !isSelected(idx));
    } else if (activeTab === 'batches') {
      updatedArray = batches.filter((_, idx) => !isSelected(idx));
    } else if (activeTab === 'events') {
      updatedArray = events.filter((_, idx) => !isSelected(idx));
    }

    try {
      await updateDoc(doc(db, 'school_data', 'gallery'), {
        [activeTab]: updatedArray
      });
      setSelectedIndexes([]);
      setIsDeleteMode(false);
    } catch (e) {
      console.error(e);
      alert('Error deleting items: ' + e);
    }
  };

  const handleSingleDelete = async (e: React.MouseEvent, index: number, category: 'teachers' | 'batches' | 'events') => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    let updatedArray: any[] = [];
    if (category === 'teachers') {
      updatedArray = teachers.filter((_, i) => i !== index);
    } else if (category === 'batches') {
      updatedArray = batches.filter((_, i) => i !== index);
    } else if (category === 'events') {
      updatedArray = events.filter((_, i) => i !== index);
    }

    try {
      await updateDoc(doc(db, 'school_data', 'gallery'), {
        [category]: updatedArray
      });
    } catch (error) {
      console.error(error);
      alert('Error deleting image: ' + error);
    }
  };

  const switchTab = (tab: 'teachers' | 'batches' | 'events') => {
    setActiveTab(tab);
    setIsDeleteMode(false);
    setSelectedIndexes([]);
  };

  return (
    <div className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
      <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <span>Photo Gallery</span>
        <div className="flex gap-2">
          <button
            onClick={() => switchTab('teachers')}
            className={`px-3 py-1 text-xs rounded border ${
              activeTab === 'teachers'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => switchTab('batches')}
            className={`px-3 py-1 text-xs rounded border ${
              activeTab === 'batches'
                ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
            }`}
          >
            Batches
          </button>
          <button
            onClick={() => switchTab('events')}
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

      {isAdminOrTeacher && (
        <div className="bg-[#f8fafc] p-4 rounded-lg border border-[#e2e8f0] mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#1e293b] mb-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <span>Add New Photo to {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            <div className="flex flex-wrap gap-2">
              {!isDeleteMode ? (
                <button onClick={() => { setIsDeleteMode(true); setSelectedIndexes([]); }} className="text-xs font-bold text-[#0284c7] border border-[#bae6fd] bg-[#f0f9ff] px-3 py-1.5 rounded hover:bg-[#e0f2fe] transition-colors flex items-center gap-1">
                  Manage Select
                </button>
              ) : (
                <>
                  {selectedIndexes.length > 0 && (
                    <button onClick={handleBulkDelete} className="text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1 bg-red-600 text-white hover:bg-red-700">
                      <Trash2 className="w-3 h-3" /> Delete Selected ({selectedIndexes.length})
                    </button>
                  )}
                  <button onClick={() => { setIsDeleteMode(false); setSelectedIndexes([]); }} className="text-xs font-bold text-[#475569] border border-[#cbd5e1] bg-white px-3 py-1.5 rounded hover:bg-[#f1f5f9] hover:text-[#1e293b] transition-colors shadow-sm">
                    Cancel Selection
                  </button>
                </>
              )}
              <button onClick={handleClearGalleryCategory} className="text-xs font-bold text-[#ef4444] border border-[#fca5a5] bg-[#fef2f2] px-3 py-1.5 rounded hover:bg-[#fee2e2] transition-colors">
                Clear Category
              </button>
            </div>
          </h3>
          
          <div className="flex gap-2 mb-3">
            <button onClick={() => setUploadMode('url')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'url' ? 'bg-[#1e3a8a] text-white' : 'bg-white border text-[#6b7280]'}`}>
              <LinkIcon className="w-3 h-3"/> URL
            </button>
            <button onClick={() => setUploadMode('file')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'file' ? 'bg-[#1e3a8a] text-white' : 'bg-white border text-[#6b7280]'}`}>
              <Upload className="w-3 h-3"/> Device
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {uploadMode === 'url' ? (
              <input type="text" placeholder="Image URL (e.g. from Imgur)" value={newImage.url} onChange={(e) => setNewImage({...newImage, url: e.target.value})} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]" />
            ) : (
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm w-full bg-white file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#1e3a8a]/10 file:text-[#1e3a8a] hover:file:bg-[#1e3a8a]/20" />
              </div>
            )}
            
            <input type="text" placeholder={activeTab === 'teachers' ? 'Teacher Name' : activeTab === 'batches' ? 'Batch Year (e.g. 2082)' : 'Event Title'} value={newImage.caption} onChange={(e) => setNewImage({...newImage, caption: e.target.value})} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]" />
            
            {activeTab === 'teachers' && (
              <input type="text" placeholder="Subject / Role" value={newImage.role} onChange={(e) => setNewImage({...newImage, role: e.target.value})} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]" />
            )}
          </div>
          
          {newImage.url && uploadMode === 'file' && (
            <div className="mb-3 flex gap-2 items-center">
              <span className="text-xs text-[#6b7280]">Preview:</span>
              <img src={newImage.url} alt="Preview" className="h-10 w-10 object-cover rounded shadow" />
            </div>
          )}

          <div className="flex gap-3 items-center">
            <button disabled={isUploading} onClick={handleAddImage} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${isUploading ? 'bg-[#cbd5e1] text-[#475569] cursor-not-allowed' : 'bg-[#1e3a8a] text-white hover:bg-[#1e40af]'}`}>
              {isUploading ? 'Uploading...' : 'Upload Photo'}
            </button>
            {galleryStatus && <span className={`text-xs font-bold ${galleryStatus.includes('Failed') || galleryStatus.includes('Error') ? 'text-red-500' : 'text-[#059669]'}`}>{galleryStatus}</span>}
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {teachers.map((teacher, idx) => (
            <div 
              key={teacher.id || idx} 
              onClick={() => isDeleteMode && toggleSelection(idx)}
              className={`group relative bg-white p-3 rounded-xl text-center border shadow-sm transition-all ${isDeleteMode ? 'cursor-pointer hover:bg-[#f3f4f6]' : 'hover:shadow-md'} ${isSelected(idx) ? 'border-red-500 ring-2 ring-red-500/20 bg-[#fef2f2]' : 'border-[#e5e7eb]'}`}
            >
              {isAdminOrTeacher && isDeleteMode && (
                <div className="absolute top-3 right-3 z-10 bg-white rounded-full flex items-center justify-center w-6 h-6 shadow pointer-events-none">
                  {isSelected(idx) ? <CheckCircle className="w-5 h-5 text-red-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                </div>
              )}
              {isAdminOrTeacher && !isDeleteMode && (
                <button 
                  onClick={(e) => handleSingleDelete(e, idx, 'teachers')}
                  className="absolute top-3 right-3 z-10 bg-white/90 p-1.5 rounded-full text-red-600 shadow-md opacity-90 transition-opacity hover:bg-red-50 hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className={`aspect-[4/5] rounded-lg overflow-hidden mb-3 border border-gray-100 ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="w-full h-full object-cover shadow-sm bg-gray-50"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-[0.85rem] font-bold text-[#1e293b] truncate" title={teacher.name}>{teacher.name}</h3>
              <p className="text-[0.7rem] text-[#64748b] font-medium truncate" title={teacher.role}>{teacher.role}</p>
            </div>
          ))}
          {teachers.length === 0 && <p className="text-sm text-gray-500 col-span-full">No staff photos uploaded yet.</p>}
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {batches.map((batch, idx) => (
            <div 
              key={batch.year || idx} 
              onClick={() => isDeleteMode ? toggleSelection(idx) : setExpandedImage(batch.image)}
              className={`group relative rounded-lg overflow-hidden border transition-all ${isDeleteMode ? 'cursor-pointer hover:opacity-90' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'} ${isSelected(idx) ? 'border-red-500 ring-4 ring-red-500/40' : 'border-[#e5e7eb]'}`}
            >
              {isAdminOrTeacher && isDeleteMode && (
                <div className="absolute top-3 right-3 z-10 bg-white/90 rounded-full flex items-center justify-center w-7 h-7 shadow-lg pointer-events-none">
                  {isSelected(idx) ? <CheckCircle className="w-6 h-6 text-red-500" /> : <Circle className="w-6 h-6 text-gray-400" />}
                </div>
              )}
              {isAdminOrTeacher && !isDeleteMode && (
                <button 
                  onClick={(e) => handleSingleDelete(e, idx, 'batches')}
                  className="absolute top-3 right-3 z-10 bg-white/90 p-1.5 rounded-full text-red-600 shadow-lg opacity-90 transition-opacity hover:bg-red-50 hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className={`aspect-[4/3] ${isDeleteMode ? 'pointer-events-none' : ''}`}>
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
            <div 
              key={event.title || idx} 
              onClick={() => isDeleteMode ? toggleSelection(idx) : setExpandedImage(event.image)}
              className={`group relative rounded-lg overflow-hidden border transition-all ${isDeleteMode ? 'cursor-pointer hover:opacity-90' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'} ${isSelected(idx) ? 'border-red-500 ring-4 ring-red-500/40' : 'border-[#e5e7eb]'}`}
            >
              {isAdminOrTeacher && isDeleteMode && (
                <div className="absolute top-3 right-3 z-10 bg-white/90 rounded-full flex items-center justify-center w-7 h-7 shadow-lg pointer-events-none">
                  {isSelected(idx) ? <CheckCircle className="w-6 h-6 text-red-500" /> : <Circle className="w-6 h-6 text-gray-400" />}
                </div>
              )}
              {isAdminOrTeacher && !isDeleteMode && (
                <button 
                  onClick={(e) => handleSingleDelete(e, idx, 'events')}
                  className="absolute top-3 right-3 z-10 bg-white/90 p-1.5 rounded-full text-red-600 shadow-lg opacity-90 transition-opacity hover:bg-red-50 hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className={`aspect-[4/3] ${isDeleteMode ? 'pointer-events-none' : ''}`}>
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
            alt="Expanded view" 
            className="max-w-full max-h-[90vh] object-contain rounded drop-shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
