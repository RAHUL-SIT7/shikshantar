import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link as LinkIcon, Trash2, Calendar, X } from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

export default function AcademicCalendar() {
  const [calendarUrls, setCalendarUrls] = useState<string[]>([]);
  const [calendarType, setCalendarType] = useState<'image' | 'pdf'>('image');
  const [isAdminOrTeacher, setIsAdminOrTeacher] = useState(false);
  
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('url');
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role === 'admin' || role === 'teacher') {
      setIsAdminOrTeacher(true);
    }
    
    const unsub = onSnapshot(doc(db, 'school_data', 'calendar'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let fetchedUrls = [];
        if (data.urls && Array.isArray(data.urls) && data.urls.length > 0) {
            fetchedUrls = data.urls;
        } else if (data.url) {
            fetchedUrls = [data.url];
        } else {
            fetchedUrls = ['https://via.placeholder.com/800x1131.png?text=Academic+Calendar+Part+1', 'https://via.placeholder.com/800x1131.png?text=Academic+Calendar+Part+2'];
        }
        setCalendarUrls(fetchedUrls);
        setCalendarType(data.type || 'image');
      } else {
        // Init default empty calendar if none exists, using a placeholder
        const defaultData = {
          urls: ['https://via.placeholder.com/800x1131.png?text=Academic+Calendar+Part+1', 'https://via.placeholder.com/800x1131.png?text=Academic+Calendar+Part+2'],
          type: 'image'
        };
        // Only admin/teacher would successfully create this, but it's okay if guest fails here
        setDoc(doc(db, 'school_data', 'calendar'), defaultData).catch(() => {});
        setCalendarUrls(defaultData.urls);
        setCalendarType(defaultData.type as 'image' | 'pdf');
      }
    });

    return () => unsub();
  }, []);

  const handleCancelUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      setIsUploading(false);
      setStatusMsg('Upload cancelled.');
      uploadTaskRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpdateCalendar = async () => {
    if (!isAdminOrTeacher) return;

    if (uploadMode === 'file' && selectedFiles.length === 0) {
      setStatusMsg('Please select at least one file.');
      return;
    }
    if (uploadMode === 'url' && !newCalendarUrl.trim()) {
      setStatusMsg('Please enter a valid URL (comma separated for multiple).');
      return;
    }

    setIsUploading(true);
    setStatusMsg('Uploading...');
    
    let finalUrls: string[] = [];
    let finalType: 'image' | 'pdf' = 'image';

    if (uploadMode === 'file' && selectedFiles.length > 0) {
      try {
        finalType = selectedFiles[0].type === 'application/pdf' ? 'pdf' : 'image';
        
        for (let i = 0; i < selectedFiles.length; i++) {
          let file = selectedFiles[i];
          
          if (finalType === 'image') {
             try {
                file = await new Promise((resolve, reject) => {
                  const img = new Image();
                  const url = URL.createObjectURL(file);
                  img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max_size = 1920;
                    if (width > height && width > max_size) {
                      height *= max_size / width;
                      width = max_size;
                    } else if (height > max_size) {
                      width *= max_size / height;
                      height = max_size;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(file); return; }
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0,0,width,height);
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                      if (blob) {
                        resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
                      } else {
                        resolve(file);
                      }
                    }, 'image/jpeg', 0.85);
                  };
                  img.onerror = () => resolve(file);
                  img.src = url;
                });
             } catch(e) {}
          }

          const extension = file.name.split('.').pop() || 'tmp';
          const storageRef = ref(storage, `calendar/academic_calendar_${Date.now()}_${i}.${extension}`);
          
          await new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTaskRef.current = uploadTask;
            
            const timeoutId = setTimeout(() => {
              if (uploadTask.snapshot.bytesTransferred === 0) {
                 uploadTask.cancel();
                 reject(new Error("UPLOAD_TIMEOUT"));
              }
            }, 20000);

            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setStatusMsg(`Uploading file ${i + 1} of ${selectedFiles.length}... ${Math.round(progress)}%`);
              }, 
              (error) => {
                clearTimeout(timeoutId);
                reject(error);
              }, 
              () => {
                clearTimeout(timeoutId);
                resolve(true);
              }
            );
          });
          
          const dlUrl = await getDownloadURL(storageRef);
          finalUrls.push(dlUrl);
        }
        uploadTaskRef.current = null;
      } catch (e: any) {
        uploadTaskRef.current = null;
        console.error("Storage upload failed: ", e);
        if (e.message === "UPLOAD_TIMEOUT") {
          setStatusMsg('Upload timed out! Please ensure Firebase Storage is enabled in your Firebase Console.');
        } else if (e.code === 'storage/canceled') {
          return;
        } else {
          setStatusMsg('Upload failed. Try URL mode instead.');
        }
        setIsUploading(false);
        return;
      }
    } else if (newCalendarUrl && uploadMode === 'url') {
      finalUrls = newCalendarUrl.split(',').map(s => s.trim()).filter(s => s);
      finalType = finalUrls[0].toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
    }

    try {
      await setDoc(doc(db, 'school_data', 'calendar'), { urls: finalUrls, type: finalType }, { merge: true });
      setNewCalendarUrl('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatusMsg('Calendar successfully updated!');
    } catch (e: any) {
      console.error(e);
      setStatusMsg('Failed to save to database. You must be an admin.');
    }
    
    setIsUploading(false);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleDeleteCalendar = async () => {
    try {
      await setDoc(doc(db, 'school_data', 'calendar'), { urls: [], type: 'image' }, { merge: true });
      setStatusMsg('Calendar removed.');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setStatusMsg('Error removing calendar.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] mb-6 p-5">
        <h2 className="text-xl font-bold text-primary mb-2 border-b pb-2">Academic Calendar</h2>
        
        {isAdminOrTeacher && (
          <div className="border-primary text-primary p-4 rounded-lg border border-[#e2e8f0] mb-6 shadow-sm mt-4">
            <h3 className="text-sm font-bold text-[#1e293b] mb-3">Update Calendar</h3>
            
            <div className="flex gap-2 mb-3">
              <button onClick={() => setUploadMode('url')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'url' ? '- text-white' : 'bg-white border text-[#6b7280]'}`}>
                <LinkIcon className="w-3 h-3"/> URL
              </button>
              <button onClick={() => setUploadMode('file')} className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 ${uploadMode === 'file' ? '- text-white' : 'bg-white border text-[#6b7280]'}`}>
                <Upload className="w-3 h-3"/> File (PDF/Image)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {uploadMode === 'url' ? (
                <input type="text" placeholder="Calendar File URLs (comma separated)" value={newCalendarUrl} onChange={(e) => setNewCalendarUrl(e.target.value)} className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-primary" />
              ) : (
                <div className="flex flex-col gap-1">
                   <span className="text-[0.65rem] font-bold text-gray-500 uppercase">Select Image(s) or PDF</span>
                   <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} className="px-3 py-1.5 border border-[#cbd5e1] rounded-lg text-sm w-full bg-white file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:- file:- hover:file:-" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <button disabled={isUploading} onClick={handleUpdateCalendar} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${isUploading ? 'bg-[#cbd5e1] text-[#475569] cursor-not-allowed' : '- text-white hover:opacity-90'}`}>
                {isUploading ? 'Uploading...' : 'Update Calendar'}
              </button>
              {isUploading && uploadMode === 'file' && (
                <button 
                  onClick={handleCancelUpload}
                  className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                   Cancel Upload
                </button>
              )}
              {calendarUrls.length > 0 && (
                 <button onClick={handleDeleteCalendar} className="px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 flex items-center gap-1">
                    <Trash2 className="w-4 h-4"/> Remove Present Calendar
                 </button>
              )}
              {statusMsg && <span className={`text-xs font-bold ${statusMsg.includes('Failed') || statusMsg.includes('Error') || statusMsg.includes('cancelled') || statusMsg.includes('timed') ? 'text-red-500' : 'text-[#059669]'}`}>{statusMsg}</span>}
            </div>
          </div>
        )}

        <div className="w-full flex justify-center border-primary text-primary rounded-lg border p-2 min-h-[50vh]">
           {calendarUrls.length > 0 ? (
              calendarType === 'pdf' ? (
                <iframe src={calendarUrls[0]} className="w-full h-[70vh] rounded" title="Academic Calendar" />
              ) : (
                <div className={`grid gap-4 w-full ${calendarUrls.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {calendarUrls.map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt={`Academic Calendar Page ${idx + 1}`} 
                      className="max-w-full h-auto rounded shadow-sm border border-[#e5e7eb] mx-auto cursor-pointer hover:shadow-md transition-shadow bg-gray-50 object-cover" 
                      onClick={() => setExpandedImage(url)}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              )
           ) : (
             <div className="flex flex-col items-center justify-center p-10 text-gray-400">
               <Calendar className="w-16 h-16 mb-2 opacity-50" />
               <p>No Academic Calendar available yet.</p>
             </div>
           )}
        </div>
      </div>

      {expandedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex justify-center items-center backdrop-blur-sm cursor-zoom-out p-4"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-white bg-white/20 hover:bg-white/40 rounded-full p-3 transition-all backdrop-blur-md shadow-lg z-[10000]"
            onClick={(e) => { e.stopPropagation(); setExpandedImage(null); }}
          >
            <X className="w-7 h-7" />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded Calendar" 
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg drop-shadow-2xl shadow-black ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()} 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
