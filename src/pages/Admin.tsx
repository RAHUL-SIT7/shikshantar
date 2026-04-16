import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Image as ImageIcon, Settings, Save } from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'results' | 'gallery' | 'content'>('gallery');
  
  // Results State
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Gallery State
  const [galleryTab, setGalleryTab] = useState<'teachers' | 'batches' | 'events'>('events');
  const [galleryItems, setGalleryItems] = useState({
    teachers: [] as any[],
    batches: [] as any[],
    events: [] as any[]
  });
  const [newImage, setNewImage] = useState({ url: '', caption: '', role: '' });
  const [galleryStatus, setGalleryStatus] = useState('');

  // Content Editor State
  const [aboutText, setAboutText] = useState('');
  const [facilitiesText, setFacilitiesText] = useState('');
  const [contentStatus, setContentStatus] = useState('');

  useEffect(() => {
    // Load Results
    const stored = localStorage.getItem('school_results');
    if (stored) setData(JSON.parse(stored));

    // Load Gallery
    const storedGallery = localStorage.getItem('school_gallery');
    if (storedGallery) {
      setGalleryItems(JSON.parse(storedGallery));
    } else {
      // Setup Defaults if none
      setGalleryItems({
        teachers: [{ id: 1, name: 'Mr. Pappu Jha', role: 'Principal', image: 'https://picsum.photos/seed/t1/400/500' }],
        batches: [{ year: '2082 B.S', image: 'https://picsum.photos/seed/b82/800/600' }],
        events: [{ title: 'Annual Sports Day', image: 'https://picsum.photos/seed/e1/800/600' }]
      });
    }

    // Load Content
    const storedAbout = localStorage.getItem('school_about');
    const storedFacilities = localStorage.getItem('school_facilities');
    if (storedAbout) setAboutText(storedAbout);
    if (storedFacilities) setFacilitiesText(storedFacilities);
  }, []);

  // --- Image Upload Handlers ---
  const handleAddImage = () => {
    if (!newImage.url || !newImage.caption) {
      setGalleryStatus('Please provide both Image URL and Caption (Name/Year/Event).');
      return;
    }

    const updatedGallery = { ...galleryItems };
    
    if (galleryTab === 'teachers') {
      updatedGallery.teachers.push({ id: Date.now(), name: newImage.caption, role: newImage.role || 'Staff', image: newImage.url });
    } else if (galleryTab === 'batches') {
      updatedGallery.batches.push({ year: newImage.caption, image: newImage.url });
    } else if (galleryTab === 'events') {
      updatedGallery.events.push({ title: newImage.caption, image: newImage.url });
    }

    setGalleryItems(updatedGallery);
    localStorage.setItem('school_gallery', JSON.stringify(updatedGallery));
    setNewImage({ url: '', caption: '', role: '' });
    setGalleryStatus('Image successfully added to gallery!');
    setTimeout(() => setGalleryStatus(''), 3000);
  };

  const handleClearGalleryCategory = () => {
    if (window.confirm(`Clear all ${galleryTab}?`)) {
      const updatedGallery = { ...galleryItems, [galleryTab]: [] };
      setGalleryItems(updatedGallery);
      localStorage.setItem('school_gallery', JSON.stringify(updatedGallery));
    }
  };

  // --- Content Handlers ---
  const handleSaveContent = () => {
    if (aboutText) localStorage.setItem('school_about', aboutText);
    if (facilitiesText) localStorage.setItem('school_facilities', facilitiesText);
    setContentStatus('Content successfully updated!');
    setTimeout(() => setContentStatus(''), 3000);
  };


  // --- CSV Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);
        
        if (parsedData.length > 0 && !('StudentId' in (parsedData[0] as object))) {
          setStatus({ type: 'error', message: 'Invalid format. Excel must have a "StudentId" column.' });
          return;
        }

        setData(parsedData);
        localStorage.setItem('school_results', JSON.stringify(parsedData));
        setStatus({ type: 'success', message: `Successfully loaded ${parsedData.length} student records.` });
      } catch (error) {
        setStatus({ type: 'error', message: 'Error parsing Excel file. Please ensure it is a valid .xlsx or .csv file.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const clearData = () => {
    if (window.confirm('Are you sure you want to clear all result data?')) {
      localStorage.removeItem('school_results');
      setData([]);
      setStatus({ type: 'success', message: 'All result data cleared.' });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* Admin Tabs */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 text-sm font-bold rounded-lg border flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f9fafb]'}`}>
          <ImageIcon className="w-4 h-4" /> Manage Photo Gallery
        </button>
        <button onClick={() => setActiveTab('content')} className={`px-4 py-2 text-sm font-bold rounded-lg border flex items-center gap-2 ${activeTab === 'content' ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f9fafb]'}`}>
          <Settings className="w-4 h-4" /> Manage Website Content
        </button>
        <button onClick={() => setActiveTab('results')} className={`px-4 py-2 text-sm font-bold rounded-lg border flex items-center gap-2 ${activeTab === 'results' ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]' : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f9fafb]'}`}>
          <FileSpreadsheet className="w-4 h-4" /> Manage Results
        </button>
      </div>

      {activeTab === 'gallery' && (
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
            <span>Photo Gallery Management</span>
          </div>
          
          <div className="flex gap-2 mb-4">
            {['teachers', 'batches', 'events'].map((tab) => (
              <button key={tab} onClick={() => setGalleryTab(tab as any)} className={`px-3 py-1 text-xs rounded border capitalize ${galleryTab === tab ? 'bg-[#f97316] text-white border-[#f97316]' : 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb] mb-5">
            <h3 className="text-sm font-bold mb-3">Add New Photo to {galleryTab.charAt(0).toUpperCase() + galleryTab.slice(1)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input type="text" placeholder="Image URL (e.g. from Google Drive or Imgur)" value={newImage.url} onChange={(e) => setNewImage({...newImage, url: e.target.value})} className="px-3 py-2 border rounded-lg text-sm w-full" />
              <input type="text" placeholder={galleryTab === 'teachers' ? 'Teacher Name' : galleryTab === 'batches' ? 'Batch Year (e.g. 2082)' : 'Event Title'} value={newImage.caption} onChange={(e) => setNewImage({...newImage, caption: e.target.value})} className="px-3 py-2 border rounded-lg text-sm w-full" />
              {galleryTab === 'teachers' && (
                <input type="text" placeholder="Subject / Role" value={newImage.role} onChange={(e) => setNewImage({...newImage, role: e.target.value})} className="px-3 py-2 border rounded-lg text-sm w-full" />
              )}
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={handleAddImage} className="bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#1e40af] transition-colors">
                Add Photo
              </button>
              {galleryStatus && <span className="text-xs font-bold text-[#10b981]">{galleryStatus}</span>}
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold">Uploaded {galleryTab.charAt(0).toUpperCase() + galleryTab.slice(1)} ({galleryItems[galleryTab].length})</h3>
            <button onClick={handleClearGalleryCategory} className="text-xs text-[#ef4444] border border-[#ef4444] px-2 py-1 rounded hover:bg-[#fef2f2]">
              Clear This Category
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {galleryItems[galleryTab].map((item: any, idx) => (
              <div key={idx} className="border border-[#e5e7eb] rounded p-2 text-center text-xs">
                <img src={item.image} alt="uploaded" className="w-full aspect-square object-cover rounded mb-1 bg-gray-100" referrerPolicy="no-referrer" />
                <p className="font-bold truncate">{item.name || item.year || item.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'content' && (
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-6 flex justify-between items-center">
            <span>Website Content Editor</span>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-[#1f2937] mb-2">Edit "About Us" Content</label>
            <textarea 
              value={aboutText} 
              onChange={(e) => setAboutText(e.target.value)} 
              placeholder="Overriding text for the About Us page..." 
              className="w-full h-32 p-3 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:border-[#1e3a8a]"
            ></textarea>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-[#1f2937] mb-2">Edit "Facilities" Description</label>
            <textarea 
              value={facilitiesText} 
              onChange={(e) => setFacilitiesText(e.target.value)} 
              placeholder="Overriding text for the Facilities page..." 
              className="w-full h-32 p-3 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:border-[#1e3a8a]"
            ></textarea>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveContent} className="flex flex-row items-center gap-2 bg-[#1e3a8a] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#1e40af] transition-colors">
              <Save className="w-4 h-4" /> Save Content Changes
            </button>
            {contentStatus && <span className="text-[#10b981] text-sm font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {contentStatus}</span>}
          </div>
        </section>
      )}

      {activeTab === 'results' && (
        <section className="bg-[#ffffff] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#e5e7eb]">
          <div className="text-[0.75rem] font-bold uppercase text-[#6b7280] mb-4 flex justify-between items-center">
            <span>Result Management (Excel Upload)</span>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#1f2937] mb-2">Upload Results (Excel/CSV)</h3>
              <p className="text-xs text-[#6b7280] mb-4">
                Upload an Excel file containing student marks. The file must have columns like: 
                <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">StudentId</code>, 
                <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">Name</code>, 
                <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">Class</code>, 
                <code className="bg-[#f3f4f6] px-1 py-0.5 rounded mx-1">Mathematics</code>, etc.
              </p>

              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#e5e7eb] border-dashed rounded-lg cursor-pointer bg-[#f9fafb] hover:bg-[#f3f4f6] transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-[#6b7280] mb-2" />
                  <p className="text-sm text-[#6b7280]"><span className="font-semibold text-[#1e3a8a]">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-[#6b7280] mt-1">.XLSX, .XLS, or .CSV</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </label>

              {status.type && (
                <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                  status.type === 'success' ? 'bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]' : 'bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {status.message}
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#f9fafb] p-4 rounded-lg border border-[#e5e7eb]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-[#1f2937] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" />
                  Current Database Status
                </h3>
                {data.length > 0 && (
                  <button onClick={clearData} className="text-xs text-[#ef4444] hover:text-[#b91c1c] flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              
              <div className="flex justify-between mb-2">
                <span className="text-[0.8rem] opacity-70">Total Records</span>
                <span className="text-[0.8rem] font-semibold">{data.length} Students</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-[0.8rem] opacity-70">Last Updated</span>
                <span className="text-[0.8rem] font-semibold">{data.length > 0 ? 'Just now' : 'Never'}</span>
              </div>

              {data.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-[#6b7280] mb-2 uppercase">Preview (First 3 rows)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[0.7rem] border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]">
                          {Object.keys(data[0]).slice(0, 4).map(key => (
                            <th key={key} className="p-1 font-semibold text-[#6b7280]">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-[#f3f4f6]">
                            {Object.values(row).slice(0, 4).map((val: any, j) => (
                              <td key={j} className="p-1">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
