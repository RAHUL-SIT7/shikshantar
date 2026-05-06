import React, { useState, useEffect } from 'react';
import { THEMES } from '../App';
import { Check, Settings, Type, Palette } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ThemeSettings() {
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('appTheme') || "classic");
  const [customPrimary, setCustomPrimary] = useState('#1a2744');
  const [customAccent, setCustomAccent] = useState('#ea580c');
  const [activeFont, setActiveFont] = useState(localStorage.getItem('appFontFamily') || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif");
  const [toast, setToast] = useState<{message: string, show: boolean}>({ message: '', show: false });

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const fonts = [
    { name: 'System Default', value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
    { name: 'Modern Sans (Inter)', value: "'Inter', sans-serif" },
    { name: 'Elegant Serif (Playfair)', value: "'Playfair Display', serif" },
    { name: 'Playful (Nunito)', value: "'Nunito', sans-serif" },
    { name: 'Tech Mono (JetBrains)', value: "'JetBrains Mono', monospace" }
  ];

  const updateGlobalSettings = async (themeKey: string, customColors: any, fontFamily: string) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        themeKey,
        customColors,
        fontFamily,
        updatedAt: new Date()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not save to global settings in Firestore", e);
    }
  };

  const applyTheme = (key: string, customColors?: any) => {
    setActiveTheme(key);
    if ((window as any).applyThemeGlobal) {
        (window as any).applyThemeGlobal(key, customColors, activeFont);
    }
    updateGlobalSettings(key, customColors || null, activeFont);
    
    if (customColors) {
        setCustomPrimary(customColors.primary);
        setCustomAccent(customColors.accent);
        showToast(`✓ Custom theme applied globally!`);
    } else if (THEMES[key]) {
        showToast(`✓ Theme changed to ${THEMES[key].name} globally!`);
    }
  };

  const handleFontChange = (fontVal: string) => {
     setActiveFont(fontVal);
     if ((window as any).applyThemeGlobal) {
        if (activeTheme === 'custom') {
           const customT = JSON.parse(localStorage.getItem('appCustomTheme') || "{}");
           (window as any).applyThemeGlobal('custom', customT, fontVal);
        } else {
           (window as any).applyThemeGlobal(activeTheme, null, fontVal);
        }
     }
     
     let currentCustom = null;
     if (activeTheme === 'custom') {
        currentCustom = JSON.parse(localStorage.getItem('appCustomTheme') || "{}");
     }
     updateGlobalSettings(activeTheme, currentCustom, fontVal);
     showToast(`✓ Font changed globally!`);
  };

  const primarySwatches = [
    '#1a2744', '#1e3a8a', '#166534', '#7f1d1d', '#4c1d95',
    '#0f766e', '#111827', '#991b1b', '#065f46', '#1e40af'
  ];

  const accentSwatches = [
    '#ea580c', '#f59e0b', '#16a34a', '#2563eb',
    '#dc2626', '#db2777', '#06b6d4', '#7c3aed'
  ];

  const handleSaveCustom = () => {
    const customObj = {
      name: "My Theme",
      primary: customPrimary,
      primaryDark: customPrimary,
      primaryLight: customPrimary,
      accent: customAccent,
      accentHover: customAccent,
      preview: [customPrimary, customAccent]
    };
    applyTheme('custom', customObj);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 relative animate-in fade-in zoom-in duration-300">
       {toast.show && (
          <div className="fixed top-8 right-8 bg-[var(--primary)] text-white px-5 py-3 rounded-lg shadow-2xl z-[9999] font-bold text-sm flex items-center gap-2 animate-in slide-in-from-right-8 fade-in">
             {toast.message}
          </div>
       )}

       <div className="flex flex-col gap-2 mb-8 mt-4">
           <h1 className="text-3xl font-black text-[var(--primary)] flex items-center gap-3">
              <Settings className="w-8 h-8 text-[var(--primary)]" /> Global Theme Settings
           </h1>
           <p className="text-[var(--text-grey)] font-medium max-w-2xl text-sm leading-relaxed">
             Choose a color theme and font style for Shikshantar Academy Portal. Changes apply instantly across the entire portal (guests, students, and admins).
           </p>
       </div>

       {/* Typography Settings */}
       <div className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><Type className="w-6 h-6 text-[var(--primary)]"/> Typography Style</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
             {fonts.map(font => {
                const isActive = activeFont === font.value;
                return (
                   <button 
                      key={font.name}
                      onClick={() => handleFontChange(font.value)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center min-h-[100px] h-auto ${isActive ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-blue-50' : 'border-gray-200 hover:border-[var(--primary)]/50 hover:bg-gray-50'}`}
                      style={{ fontFamily: font.value }}
                   >
                      <span className={`text-sm md:text-base font-bold ${isActive ? 'text-[var(--primary)]' : 'text-gray-700'}`}>{font.name}</span>
                      {isActive && <span className="text-[10px] uppercase tracking-widest text-[var(--primary)] font-black mt-1">Active</span>}
                   </button>
                )
             })}
          </div>
       </div>

       {/* Preset Themes Grid */}
       <div className="mb-12">
         <h2 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2"><Palette className="w-6 h-6 text-[var(--primary)]"/> Color Themes</h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.keys(THEMES).map(key => {
               const t = THEMES[key];
               const isActive = activeTheme === key;
               return (
                 <div key={key} className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 shadow-sm border border-gray-100 flex flex-col ${isActive ? 'ring-4 ring-[var(--primary)] scale-[1.02] shadow-xl' : 'hover:-translate-y-1 hover:shadow-lg'}`}>
                    <div className="h-[60px] w-full relative shrink-0" style={{ backgroundColor: t.primary }}>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 w-6 h-6 rounded-full shadow-sm border-2 border-white/40" style={{ backgroundColor: t.accent }}></div>
                    </div>
                    <div className="p-5 flex flex-col flex-1 gap-3">
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-2">
                              <span className="text-xl">{t.emoji}</span>
                              <h3 className="font-bold text-base leading-tight text-gray-900 truncate" title={t.name}>{t.name}</h3>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: t.primary }}></div>
                           <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: t.primaryLight }}></div>
                           <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: t.accent }}></div>
                        </div>

                        <div className="mt-auto pt-4">
                           {isActive ? (
                              <div className="w-full text-center py-2.5 text-sm font-bold bg-green-50 rounded-lg border-2 border-green-500 text-green-700 shadow-sm flex justify-center items-center gap-2"><Check className="w-4 h-4"/> Active Theme</div>
                           ) : (
                              <button onClick={() => applyTheme(key)} className="w-full py-2.5 text-sm font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors active:scale-95 shadow-sm">Apply Theme →</button>
                           )}
                        </div>
                    </div>
                 </div>
               );
            })}
            
            {/* Custom Theme Card (if active) */}
            {activeTheme === 'custom' && (
                 <div className={`bg-white rounded-2xl overflow-hidden transition-all duration-200 shadow-xl ring-4 ring-[var(--primary)] scale-[1.02] flex flex-col border border-gray-100`}>
                    <div className="h-[60px] w-full relative shrink-0" style={{ backgroundColor: customPrimary }}>
                        <div className="absolute top-1/2 -translate-y-1/2 right-4 w-6 h-6 rounded-full shadow-sm border-2 border-white/40" style={{ backgroundColor: customAccent }}></div>
                    </div>
                    <div className="p-5 flex flex-col flex-1 gap-3">
                        <div className="flex items-center gap-2">
                           <span className="text-xl">⭐</span>
                           <h3 className="font-bold text-base leading-tight text-gray-900">My Custom Theme</h3>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: customPrimary }}></div>
                           <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: customAccent }}></div>
                        </div>
                        <div className="mt-auto pt-4">
                           <div className="w-full text-center py-2.5 text-sm font-bold bg-green-50 rounded-lg border-2 border-green-500 text-green-700 shadow-sm flex justify-center items-center gap-2"><Check className="w-4 h-4"/> Active Theme</div>
                        </div>
                    </div>
                 </div>
            )}
         </div>
       </div>

       {/* Custom Colors Section */}
       <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 border-b border-gray-100 pb-2">🎯 Mix Custom Colors</h2>
          <p className="text-sm text-gray-500 font-medium mb-6">Create your own specific color combination to apply to the portal.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
             <div className="space-y-8">
                 {/* Primary Colors */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">Primary Base (Sidebar, Headers)</label>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                       {primarySwatches.map(color => (
                          <div 
                             key={color} 
                             onClick={() => { setCustomPrimary(color); document.documentElement.style.setProperty("--primary", color); }}
                             className="w-[calc(20%-0.6rem)] sm:w-12 h-12 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center shadow-md border border-black/10"
                             style={{ 
                               backgroundColor: color, 
                               outline: customPrimary === color ? '3px solid var(--text-dark)' : 'none',
                               outlineOffset: '3px'
                             }}
                          >
                             {customPrimary === color && <Check className="w-6 h-6 text-white drop-shadow-md" />}
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Accent Colors */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">Accent (Buttons, Highlights)</label>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                       {accentSwatches.map(color => (
                          <div 
                             key={color} 
                             onClick={() => { setCustomAccent(color); document.documentElement.style.setProperty("--accent", color); }}
                             className="w-[calc(25%-0.75rem)] sm:w-12 h-12 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center shadow-md border border-black/10"
                             style={{ 
                               backgroundColor: color, 
                               outline: customAccent === color ? '3px solid var(--text-dark)' : 'none',
                               outlineOffset: '3px'
                             }}
                          >
                             {customAccent === color && <Check className="w-6 h-6 text-white drop-shadow-md" />}
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="pt-4 flex flex-col sm:flex-row gap-4">
                    <button onClick={handleSaveCustom} className="flex-1 py-3 px-6 bg-[var(--primary)] text-white font-bold rounded-xl shadow-md hover:scale-[1.02] active:scale-95 transition-all text-sm w-full sm:w-auto text-center border-2 border-transparent">Save & Apply</button>
                    <button onClick={() => { applyTheme('classic'); setCustomPrimary('#1a2744'); setCustomAccent('#ea580c'); }} className="flex-1 py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all text-sm w-full sm:w-auto text-center">Reset Default</button>
                 </div>
             </div>

             {/* Live Preview Panel */}
             <div className="bg-gray-50 rounded-2xl shadow-inner border border-gray-200 overflow-hidden flex flex-col h-full min-h-[300px]">
                <div className="bg-white border-b border-gray-200 px-4 py-3 font-bold text-sm text-gray-700">Live Custom UI Preview</div>
                <div className="p-0 flex flex-1 relative w-full">
                    
                    {/* Mock Sidebar */}
                    <div className="w-[100px] sm:w-[130px] shrink-0 h-full p-3 flex flex-col gap-3" style={{ backgroundColor: customPrimary }}>
                       <div className="w-full h-8 bg-white/20 rounded-md mb-2"></div>
                       <div className="flex items-center gap-2 p-2 rounded bg-white/10" style={{ borderLeft: `3px solid ${customAccent}` }}>
                           <div className="w-3 h-3 rounded-full bg-white/50"></div>
                           <div className="h-2 w-full bg-white/90 rounded"></div>
                       </div>
                       <div className="flex items-center gap-2 p-2 rounded opacity-60">
                           <div className="w-3 h-3 rounded-full bg-white/50"></div>
                           <div className="h-2 w-[80%] bg-white/80 rounded"></div>
                       </div>
                       <div className="flex items-center gap-2 p-2 rounded opacity-60">
                           <div className="w-3 h-3 rounded-full bg-white/50"></div>
                           <div className="h-2 w-[90%] bg-white/80 rounded"></div>
                       </div>
                    </div>

                    {/* Mock Main Area */}
                    <div className="flex-1 p-5 flex flex-col gap-5 overflow-hidden">
                       <div className="flex flex-wrap gap-2">
                          <div className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm" style={{ backgroundColor: customPrimary }}>Primary Button</div>
                          <div className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm" style={{ backgroundColor: customAccent }}>Accent Button</div>
                       </div>

                       <div className="bg-white rounded-xl shadow-md p-4 w-full flex gap-3" style={{ borderLeft: `4px solid ${customPrimary}` }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold" style={{ backgroundColor: `${customPrimary}20`, color: customPrimary }}>S</div>
                          <div>
                             <div className="h-3 w-16 sm:w-20 bg-gray-200 rounded mb-2"></div>
                             <div className="text-sm sm:text-base font-black truncate" style={{ color: customPrimary }}>NRs. 14,000</div>
                          </div>
                       </div>

                       <div className="flex gap-2 mt-auto">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">Paid</span>
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200">Due</span>
                       </div>
                    </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
