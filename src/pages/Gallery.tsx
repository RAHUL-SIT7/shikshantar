import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, Trash2, CheckCircle, Circle, X } from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
const teachersGroupImg = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1470&auto=format&fit=crop";
const tiharEventImg = "https://images.unsplash.com/photo-1605151523425-46fdad6ff468?q=80&w=1548&auto=format&fit=crop";

export default function Gallery() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'batches' | 'events'>('batches');

  const [teachers, setTeachers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [newImage, setNewImage] = useState({ url: '', caption: '', role: '', type: 'image' });
  const [uploadMode, setUploadMode] = useState<'url' | 'file' | 'camera'>('url');
  const [galleryStatus, setGalleryStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const userRole = localStorage.getItem('userRole');
  const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);

  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const handleCancelUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      setIsUploading(false);
      setGalleryStatus('Upload cancelled.');
      uploadTaskRef.current = null;
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'school_data', 'gallery'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let currentTeachers = data.teachers || [];
        let currentEvents = data.events || [];
        
        // Ensure default images exist initially, only run once
        if (data.hasMergedDefaults !== true) {
           if (!currentTeachers.find((t: any) => t.image === teachersGroupImg)) {
              currentTeachers.unshift({ id: 1, name: 'Teaching Faculty', role: 'Principal & Staff', image: teachersGroupImg, type: 'image' });
           }
           if (!currentEvents.find((e: any) => e.image === tiharEventImg)) {
              currentEvents.unshift({ title: 'Celebrating Tihar', image: tiharEventImg, type: 'image' });
           }
           setDoc(doc(db, 'school_data', 'gallery'), { ...data, teachers: currentTeachers, events: currentEvents, hasMergedDefaults: true }, { merge: true }).catch(console.error);
        }

        setTeachers(currentTeachers);
        setBatches(data.batches || []);
        setEvents(currentEvents);
      } else {
        // Init default if doesn't exist
        const defaultData = {
          teachers: [
            { id: 1, name: 'Teaching Faculty', role: 'Principal & Staff', image: teachersGroupImg, type: 'image' },
            { id: 2, name: 'Mr. Pappu Jha', role: 'Principal', image: 'https://picsum.photos/seed/t1/400/500', type: 'image' },
            { id: 3, name: 'Mrs. Sharma', role: 'Science Teacher', image: 'https://picsum.photos/seed/t2/400/500', type: 'image' },
            { id: 4, name: 'Mr. Koirala', role: 'Math Teacher', image: 'https://picsum.photos/seed/t3/400/500', type: 'image' },
            { id: 5, name: 'Ms. Thapa', role: 'English Teacher', image: 'https://picsum.photos/seed/t4/400/500', type: 'image' },
          ],
          batches: [
            { year: '2082 B.S', image: 'https://picsum.photos/seed/b82/800/600', type: 'image' },
            { year: '2081 B.S', image: 'https://picsum.photos/seed/b81/800/600', type: 'image' },
          ],
          events: [
            { title: 'Celebrating Tihar', image: tiharEventImg, type: 'image' },
            { title: 'Annual Sports Day', image: 'https://picsum.photos/seed/e1/800/600', type: 'image' },
            { title: 'Science Exhibition', image: 'https://picsum.photos/seed/e2/800/600', type: 'image' },
          ]
        };
        setDoc(doc(db, 'school_data', 'gallery'), defaultData).catch(console.error);
      }
    }, (err) => {
      console.warn("Gallery listener error:", err.message);
    });

    return () => unsub();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const isVideo = file.type.startsWith('video/');
      
      // Use createObjectURL for preview to avoid browser memory crash on large videos
      const previewUrl = URL.createObjectURL(file);
      setNewImage({ ...newImage, url: previewUrl, type: isVideo ? 'video' : 'image' });
    }
  };

  const handleAddMedia = async () => {
    if ((!newImage.url && !selectedFile) || !newImage.caption) {
      setGalleryStatus('Please provide both Media URL/File and Caption.');
      return;
    }

    setIsUploading(true);
    setGalleryStatus('Uploading... Please wait (this could take a while for videos).');
    
    let finalImageUrl = newImage.url;

    if (uploadMode === 'file' && selectedFile) {
      try {
        const isVideo = selectedFile.type.startsWith('video/');
        
        // If image is very small, we can safely bypass Storage and save as Base64 in Firestore
        if (!isVideo && selectedFile.size < 800 * 1024) {
          const base64Url = await new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve(reader.result as string);
             reader.readAsDataURL(selectedFile);
          });
          finalImageUrl = base64Url;
        } else {
          // For videos or large images, we MUST use Firebase Storage
          const extension = selectedFile.name.split('.').pop() || 'tmp';
          const storageRef = ref(storage, `media/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`);
          
          await new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);
            uploadTaskRef.current = uploadTask;
            
            // If it hangs at 0% for 20 seconds, the Firebase Storage bucket is likely not initialized
            const timeoutId = setTimeout(() => {
              if (uploadTask.snapshot.bytesTransferred === 0) {
                 uploadTask.cancel();
                 reject(new Error("UPLOAD_TIMEOUT"));
              }
            }, 20000);

            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setGalleryStatus(`Uploading... ${Math.round(progress)}%`);
              }, 
              (error) => {
                clearTimeout(timeoutId);
                reject(error);
              }, 
              () => {
                clearTimeout(timeoutId);
                uploadTaskRef.current = null;
                resolve(true);
              }
            );
          });
          
          finalImageUrl = await getDownloadURL(storageRef);
        }
      } catch (e: any) {
        uploadTaskRef.current = null;
        console.error("Storage upload failed: ", e);
        if (e.message === "UPLOAD_TIMEOUT") {
          setGalleryStatus('Upload timed out! Please ensure Firebase Storage is enabled in your Firebase Console, or check your internet connection.');
        } else if (e.code === 'storage/canceled') {
          // Already handled in handleCancelUpload
          return;
        } else {
          setGalleryStatus('Upload failed. Using URL mode is recommended if Firebase Storage is restricted.');
        }
        setIsUploading(false);
        return;
      }
    } else if (newImage.url && uploadMode === 'url') {
      const isUrlVideo = newImage.url.match(/\.(mp4|webm|mov|ogg)(\?|$)/i) ? 'video' : 'image';
      newImage.type = isUrlVideo;
    }
    
    const updatedGallery = { teachers, batches, events };
    
    if (activeTab === 'teachers') {
      const updated = [...teachers, { id: Date.now(), name: newImage.caption, role: newImage.role || 'Staff', image: finalImageUrl, type: newImage.type }];
      updatedGallery.teachers = updated;
    } else if (activeTab === 'batches') {
      const updated = [...batches, { year: newImage.caption, image: finalImageUrl, type: newImage.type }];
      updatedGallery.batches = updated;
    } else if (activeTab === 'events') {
      const updated = [...events, { title: newImage.caption, image: finalImageUrl, type: newImage.type }];
      updatedGallery.events = updated;
    }

    try {
      await setDoc(doc(db, 'school_data', 'gallery'), updatedGallery, { merge: true });
      setNewImage({ url: '', caption: '', role: '', type: 'image' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setGalleryStatus('Media successfully added to gallery!');
    } catch (e: any) {
      console.error(e);
      setGalleryStatus('Failed to save to database. You must be an authorized admin/teacher to upload.');
    }
    
    setIsUploading(false);
    setTimeout(() => setGalleryStatus(''), 4000);
  };

  const handleClearGalleryCategory = async () => {
    try {
      setGalleryStatus('Clearing category...');
      const updatedGallery = { teachers, batches, events };
      updatedGallery[activeTab] = [];
      await setDoc(doc(db, 'school_data', 'gallery'), updatedGallery, { merge: true });
      setSelectedIndexes([]);
      setIsDeleteMode(false);
      setGalleryStatus('Category cleared!');
      setTimeout(() => setGalleryStatus(''), 3000);
    } catch (e: any) {
      console.error(e);
      setGalleryStatus('Error clearing category: ' + (e?.message || 'Unknown error.'));
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
    setShowConfirmModal(true);
  };

  const confirmBulkDelete = async () => {
    setShowConfirmModal(false);
    setGalleryStatus('Deleting selected...');
    let updatedArray: any[] = [];
    if (activeTab === 'teachers') {
      updatedArray = teachers.filter((_, idx) => !isSelected(idx));
    } else if (activeTab === 'batches') {
      updatedArray = batches.filter((_, idx) => !isSelected(idx));
    } else if (activeTab === 'events') {
      updatedArray = events.filter((_, idx) => !isSelected(idx));
    }

    try {
      const updatedGallery = { teachers, batches, events };
      updatedGallery[activeTab] = updatedArray;
      
      await setDoc(doc(db, 'school_data', 'gallery'), updatedGallery, { merge: true });
      setSelectedIndexes([]);
      setIsDeleteMode(false);
      setGalleryStatus('Items deleted!');
      setTimeout(() => setGalleryStatus(''), 3000);
    } catch (e: any) {
      console.error(e);
      setGalleryStatus('Error deleting items: ' + (e?.message || 'Unknown error.'));
    }
  };

  const switchTab = (tab: 'teachers' | 'batches' | 'events') => {
    setActiveTab(tab);
    setIsDeleteMode(false);
    setSelectedIndexes([]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
      <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <span>Categories</span>
        <div className="flex gap-2">
          <button
            onClick={() => switchTab('teachers')}
            className={`px-3 py-1 text-xs font-bold rounded border ${ activeTab === 'teachers' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb] hover:bg-gray-100' }`}
          >
            Faculty & Team
          </button>
          <button
            onClick={() => switchTab('batches')}
            className={`px-3 py-1 text-xs font-bold rounded border ${ activeTab === 'batches' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb] hover:bg-gray-100' }`}
          >
            Batches
          </button>
          <button
            onClick={() => switchTab('events')}
            className={`px-3 py-1 text-xs font-bold rounded border ${ activeTab === 'events' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb] hover:bg-gray-100' }`}
          >
            Events
          </button>
        </div>
      </div>

      {isAdminOrTeacher && (
        <div className="border-primary text-primary p-4 rounded-lg border border-[#e2e8f0] mb-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#1e293b] mb-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <span>Add New Media to {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            <div className="flex flex-wrap gap-2">
              {!isDeleteMode ? (
                <button onClick={() => { setIsDeleteMode(true); setSelectedIndexes([]); }} className="text-xs font-bold text-[#0284c7] border border-[#bae6fd] bg-[#f0f9ff] px-3 py-1.5 rounded hover:bg-[#e0f2fe] transition-colors flex items-center gap-1">
                  Delete Media
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
            </div>
          </h3>
          
          <div className="flex gap-2 mb-3">
            <button onClick={() => setUploadMode('url')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'url' ? 'bg-[var(--primary)] text-white' : 'bg-white border text-[#6b7280]'}`}>
              <LinkIcon className="w-3 h-3"/> URL
            </button>
            <button onClick={() => setUploadMode('file')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'file' ? 'bg-[var(--primary)] text-white' : 'bg-white border text-[#6b7280]'}`}>
              <Upload className="w-3 h-3"/> Device
            </button>
            <button onClick={() => setUploadMode('camera')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'camera' ? 'bg-[var(--primary)] text-white' : 'bg-white border text-[#6b7280]'}`}>
              <ImageIcon className="w-3 h-3"/> Camera
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            {uploadMode === 'url' ? (
              <input type="text" placeholder="Image URL (e.g. from Imgur)" value={newImage.url} onChange={(e) => setNewImage({...newImage, url: e.target.value})} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-gray-800" />
            ) : uploadMode === 'camera' ? (
              <div className="flex flex-col gap-1">
                <span className="text-[0.65rem] font-bold text-gray-500 uppercase">Will request Camera Permission</span>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" capture="environment" onChange={handleFileChange} className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm w-full bg-white file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--primary)] file:text-white hover:file:opacity-90" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                 <span className="text-[0.65rem] font-bold text-gray-500 uppercase">Select from File System (Images/Video up to 5min)</span>
                 <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm w-full bg-white file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--primary)] file:text-white hover:file:opacity-90" />
              </div>
            )}
            
            <input type="text" placeholder={activeTab === 'teachers' ? 'Teacher Name' : activeTab === 'batches' ? 'Batch Year (e.g. 2082)' : 'Event Title'} value={newImage.caption} onChange={(e) => setNewImage({...newImage, caption: e.target.value})} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-gray-800" />
            
            {activeTab === 'teachers' && (
              <input type="text" placeholder="Subject / Role" value={newImage.role} onChange={(e) => setNewImage({...newImage, role: e.target.value})} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-gray-800" />
            )}
          </div>
          
          {newImage.url && uploadMode === 'file' && (
            <div className="mb-3 flex gap-2 items-center">
              <span className="text-xs text-[#6b7280]">Preview:</span>
              {newImage.type === 'video' ? (
                <video src={newImage.url} className="h-10 w-10 object-cover rounded shadow" muted />
              ) : (
                <img src={newImage.url} alt="Preview" className="h-10 w-10 object-cover rounded shadow" />
              )}
            </div>
          )}

          <div className="flex gap-3 items-center">
            <button disabled={isUploading} onClick={handleAddMedia} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${isUploading ? 'bg-[#cbd5e1] text-[#475569] cursor-not-allowed' : 'bg-[var(--primary)] text-white hover:opacity-90'}`}>
              {isUploading ? 'Uploading...' : 'Upload Media'}
            </button>
            {isUploading && uploadMode === 'file' && (
              <button 
                onClick={handleCancelUpload}
                className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                Cancel Upload
              </button>
            )}
            {galleryStatus && <span className={`text-xs font-bold ${galleryStatus.includes('Failed') || galleryStatus.includes('Error') || galleryStatus.includes('cancelled') || galleryStatus.includes('timed') ? 'text-red-500' : 'text-[#059669]'}`}>{galleryStatus}</span>}
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teachers.map((teacher, idx) => (
            <div 
              key={teacher.id || idx} 
              onClick={() => isDeleteMode ? toggleSelection(idx) : setExpandedImage(teacher.image)}
              className={`group relative bg-white p-3 rounded-xl text-center border shadow-sm transition-all ${isDeleteMode ? 'cursor-pointer hover:bg-[#f3f4f6]' : 'cursor-pointer hover:shadow-md'} ${isSelected(idx) ? 'border-red-500 ring-2 ring-red-500/20 bg-[#fef2f2]' : 'border-[#e5e7eb]'}`}
            >
              {isAdminOrTeacher && isDeleteMode && (
                <div className="absolute top-3 right-3 z-10 bg-white rounded-full flex items-center justify-center w-6 h-6 shadow pointer-events-none">
                  {isSelected(idx) ? <CheckCircle className="w-5 h-5 text-red-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                </div>
              )}
              <div className={`aspect-[4/5] rounded-lg overflow-hidden mb-3 border border-gray-100 ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                {teacher.type === 'video' || teacher.image?.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <video src={teacher.image} className="w-full h-full object-cover shadow-sm text-primary" muted />
                ) : (
                  <img
                    src={teacher.image}
                    alt={teacher.name}
                    className="w-full h-full object-cover shadow-sm text-primary"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <h3 className="text-[0.85rem] font-bold text-[#1e293b] truncate" title={teacher.name}>{teacher.name}</h3>
              <p className="text-[0.7rem] text-[#64748b] font-medium truncate" title={teacher.role}>{teacher.role}</p>
            </div>
          ))}
          {teachers.length === 0 && <p className="text-sm text-gray-500 col-span-full">No other staff photos uploaded yet.</p>}
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className={`aspect-[4/3] ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                {batch.type === 'video' || batch.image?.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <video src={batch.image} className="w-full h-full object-cover" muted />
                ) : (
                  <img
                    src={batch.image}
                    alt={`Batch ${batch.year}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className={`aspect-[4/3] ${isDeleteMode ? 'pointer-events-none' : ''}`}>
                {event.type === 'video' || event.image?.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                  <video src={event.image} className="w-full h-full object-cover" muted />
                ) : (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
                <h3 className="text-[0.75rem] font-bold text-white">{event.title}</h3>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-xs text-gray-500 col-span-full">No other event photos uploaded yet.</p>}
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
          {expandedImage.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
            <video 
              src={expandedImage} 
              controls
              className="max-w-full max-h-[90vh] object-contain rounded drop-shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          ) : (
            <img 
              src={expandedImage} 
              alt="Expanded view" 
              className="max-w-full max-h-[90vh] object-contain rounded drop-shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden text-center">
            <div className="p-6 bg-red-50 border-b border-red-100">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-red-700">Delete Media?</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6 font-medium">Are you sure? The selected {selectedIndexes.length} item(s) will be permanently deleted from the database.</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmBulkDelete}
                  className="px-5 py-2 text-white font-bold bg-red-600 hover:bg-red-700 shadow-md rounded-lg transition-colors w-full"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
