import React, { useState, useMemo } from 'react';
import { Search, MapPin, Award, Briefcase, GraduationCap, Edit2, Trash2, Star, Plus, Mail, X, CheckCircle2, BarChart2, PieChart, ChevronDown } from 'lucide-react';

const initialAlumni = [
  {
    id: 1,
    name: "Rajesh Kumar Sah",
    graduationYear: "2075 B.S. (2018 A.D.)",
    batch: "SEE Batch 2075",
    class: "Class 10",
    seeBand: "3.85 GPA",
    currentStatus: "Engineer",
    organization: "Nepal Electricity Authority, Kathmandu",
    degree: "B.E. Civil Engineering — Pulchowk Campus, IOE",
    location: "Kathmandu, Nepal",
    quote: "Shikshantar Academy gave me the strong foundation in Mathematics and Science that helped me crack the IOE entrance exam. I am forever grateful to my teachers.",
    achievement: "District Topper in SEE 2075",
    photo: null,
    category: "Engineering",
    featured: true
  },
  {
    id: 2,
    name: "Sunita Thapa Magar",
    graduationYear: "2076 B.S. (2019 A.D.)",
    batch: "SEE Batch 2076",
    class: "Class 10",
    seeBand: "3.70 GPA",
    currentStatus: "Medical Student",
    organization: "BP Koirala Institute of Health Sciences, Dharan",
    degree: "MBBS — 4th Year",
    location: "Dharan, Sunsari, Nepal",
    quote: "The science labs and dedicated teachers at Shikshantar helped me build my interest in Biology. Today I am living my dream of becoming a doctor.",
    achievement: "Selected in MBBS entrance from Province 2",
    photo: null,
    category: "Medical",
    featured: true
  },
  {
    id: 3,
    name: "Amit Yadav",
    graduationYear: "2077 B.S. (2020 A.D.)",
    batch: "SEE Batch 2077",
    class: "Class 10",
    seeBand: "3.55 GPA",
    currentStatus: "Software Developer",
    organization: "F1Soft International, Kathmandu",
    degree: "B.Sc. CSIT — Tribhuvan University",
    location: "Kathmandu, Nepal",
    quote: "The computer classes at Shikshantar sparked my interest in technology. Now I work at one of Nepal's leading fintech companies.",
    achievement: "Developed eSewa payment module feature",
    photo: null,
    category: "Technology",
    featured: true
  },
  {
    id: 4,
    name: "Priya Rai",
    graduationYear: "2078 B.S. (2021 A.D.)",
    batch: "SEE Batch 2078",
    class: "Class 10",
    seeBand: "3.80 GPA",
    currentStatus: "Teacher",
    organization: "Shree Janata Secondary School, Siraha",
    degree: "B.Ed. — Tribhuvan University",
    location: "Siraha, Nepal",
    quote: "I always wanted to give back to my community. Shikshantar Academy inspired me to become a teacher and now I teach the next generation right here in Siraha.",
    achievement: "Best Student Award 2078 — District Level",
    photo: null,
    category: "Education",
    featured: false
  },
  {
    id: 5,
    name: "Bikash Mandal",
    graduationYear: "2079 B.S. (2022 A.D.)",
    batch: "SEE Batch 2079",
    class: "Class 10",
    seeBand: "3.45 GPA",
    currentStatus: "Bank Officer",
    organization: "Nepal Bank Limited, Siraha Branch",
    degree: "BBS — Tribhuvan University",
    location: "Siraha, Nepal",
    quote: "The discipline and values I learned at Shikshantar Academy helped me succeed in my banking career. This school shapes character, not just academics.",
    achievement: "Passed Nepal Bank Officer Exam 2081",
    photo: null,
    category: "Finance",
    featured: false
  },
  {
    id: 6,
    name: "Anita Kumari Shah",
    graduationYear: "2080 B.S. (2023 A.D.)",
    batch: "SEE Batch 2080",
    class: "Class 10",
    seeBand: "3.90 GPA",
    currentStatus: "+2 Science Student",
    organization: "Janakpur Multiple Campus, Janakpur",
    degree: "+2 Science (NEB) — Currently Studying",
    location: "Janakpur, Dhanusha, Nepal",
    quote: "Getting A+ in Science and Mathematics in SEE was possible because of the extra classes and support our teachers gave us at Shikshantar.",
    achievement: "School Topper SEE 2080 — 3.90 GPA",
    photo: null,
    category: "Science",
    featured: true
  },
  {
    id: 7,
    name: "Suresh Paswan",
    graduationYear: "2074 B.S. (2017 A.D.)",
    batch: "SEE Batch 2074",
    class: "Class 10",
    seeBand: "3.20 GPA",
    currentStatus: "Entrepreneur",
    organization: "Siraha Digital Printing & Services",
    degree: "BIM — Tribhuvan University",
    location: "Siraha, Nepal",
    quote: "Shikshantar taught me to work hard and never give up. I started my own business in Siraha and now employ 5 people from our community.",
    achievement: "Founded local business employing 5+ people",
    photo: null,
    category: "Business",
    featured: false
  },
  {
    id: 8,
    name: "Kavita Chaudhary",
    graduationYear: "2081 B.S. (2024 A.D.)",
    batch: "SEE Batch 2081",
    class: "Class 10",
    seeBand: "3.75 GPA",
    currentStatus: "+2 Management Student",
    organization: "Birgunj Campus, Birgunj",
    degree: "+2 Management (NEB) — Currently Studying",
    location: "Birgunj, Parsa, Nepal",
    quote: "The teachers here genuinely care about each student. They pushed me to work harder and believe in myself. I am proud to be a Shikshantar graduate.",
    achievement: "District Level Essay Competition Winner 2081",
    photo: null,
    category: "Management",
    featured: false
  }
];

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getCategoryBadgeStyles = (category: string) => {
  const colors: Record<string, string> = {
    Engineering: 'bg-blue-100 text-blue-700',
    Medical: 'bg-red-100 text-red-700',
    Technology: 'bg-purple-100 text-purple-700',
    Education: 'bg-green-100 text-green-700',
    Finance: 'bg-teal-100 text-teal-700',
    Business: 'bg-orange-100 text-orange-700',
    Science: 'bg-indigo-100 text-indigo-700',
    Management: 'bg-pink-100 text-pink-700',
    Other: 'bg-gray-100 text-gray-700'
  };
  return colors[category] || colors.Other;
};

const getCategoryBorderStyles = (category: string) => {
  const colors: Record<string, string> = {
    Engineering: 'border-l-blue-500',
    Medical: 'border-l-red-500',
    Technology: 'border-l-purple-500',
    Education: 'border-l-green-500',
    Finance: 'border-l-teal-500',
    Business: 'border-l-orange-500',
    Science: 'border-l-indigo-500',
    Management: 'border-l-pink-500',
    Other: 'border-l-gray-500'
  };
  return colors[category] || colors.Other;
};

export default function Alumni() {
  const userRole = localStorage.getItem('userRole');
  const actualAdmin = userRole === 'admin';
  const [previewAsStudent, setPreviewAsStudent] = useState(false);
  const isAdmin = actualAdmin && !previewAsStudent;

  const [alumni, setAlumni] = useState(initialAlumni);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlumnus, setEditingAlumnus] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', graduationYear: '', batch: '', seeBand: '', currentStatus: '',
    organization: '', degree: '', location: '', quote: '', achievement: '',
    category: 'Other', featured: false, photo: ''
  });
  const [toastMessage, setToastMessage] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [expandedQuotes, setExpandedQuotes] = useState<Record<number, boolean>>({});

  const categories = ["All", "Engineering", "Medical", "Technology", "Education", "Finance", "Business", "Science", "Management", "Other"];
  const years = ["All", "SEE 2074", "2075", "2076", "2077", "2078", "2079", "2080", "2081", "2082", "2083"];

  const filteredAlumni = useMemo(() => {
    return alumni.filter(a => {
      const searchLower = search.toLowerCase();
      const matchSearch = 
        a.name.toLowerCase().includes(searchLower) ||
        a.organization.toLowerCase().includes(searchLower) ||
        a.currentStatus.toLowerCase().includes(searchLower) ||
        a.batch.toLowerCase().includes(searchLower);
      const matchCategory = 
        selectedCategory === "All" || 
        a.category === selectedCategory;
      const matchYear = 
        selectedYear === "All" || 
        a.graduationYear.includes(selectedYear) ||
        a.batch.includes(selectedYear);
      return matchSearch && matchCategory && matchYear;
    });
  }, [alumni, search, selectedCategory, selectedYear]);

  const featuredAlumni = filteredAlumni.filter(a => a.featured);

  const toggleQuote = (id: number) => {
    setExpandedQuotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleOpenModal = (alumnus = null) => {
    if (alumnus) {
      setEditingAlumnus(alumnus);
      setFormData({ ...alumnus });
    } else {
      setEditingAlumnus(null);
      setFormData({
        name: '', graduationYear: '', batch: '', seeBand: '', currentStatus: '',
        organization: '', degree: '', location: '', quote: '', achievement: '',
        category: 'Other', featured: false, photo: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingAlumnus) {
      setAlumni(alumni.map(a => a.id === editingAlumnus.id ? { ...formData, id: editingAlumnus.id } : a));
    } else {
      setAlumni([...alumni, { ...formData, id: Date.now() }]);
    }
    setIsModalOpen(false);
    showToast('✓ Alumni record saved!');
  };

  const handleDelete = () => {
    if (deleteId) {
      setAlumni(alumni.filter(a => a.id !== deleteId));
      setDeleteId(null);
      showToast('✓ Alumni record removed!');
    }
  };

  const toggleFeatured = (id: number) => {
    setAlumni(alumni.map(a => a.id === id ? { ...a, featured: !a.featured } : a));
  };

  // Stats for Admin
  const stats = useMemo(() => {
    const total = alumni.length;
    const featured = alumni.filter(a => a.featured).length;
    const uniqueCats = new Set(alumni.map(a => a.category)).size;
    
    const catCounts: Record<string, number> = {};
    alumni.forEach(a => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
    });
    
    return { total, featured, uniqueCats, catCounts };
  }, [alumni]);

  return (
    <div className="bg-[#F5F6FA] min-h-screen pb-12 relative animate-in fade-in duration-500">
      
      {/* Admin Toolbar */}
      {actualAdmin && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4 text-sm font-bold text-gray-600">
            <span>Total: {stats.total} Alumni</span>
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
            <span>Featured: {stats.featured}</span>
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
            <span>Categories: {stats.uniqueCats}</span>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-700 transition">
              <input type="checkbox" checked={previewAsStudent} onChange={() => setPreviewAsStudent(!previewAsStudent)} className="w-4 h-4 accent-indigo-600" />
              Preview as Student
            </label>
            <button 
              onClick={() => handleOpenModal()} 
              className="bg-[#1a2744] hover:bg-[#25375f] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ml-auto"
            >
              <Plus className="w-4 h-4" /> Add New Alumni
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          {toastMessage}
        </div>
      )}

      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-[#1a2744] to-[#25375f] text-white py-12 md:py-16 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center md:text-left mb-10">
            <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight flex items-center justify-center md:justify-start gap-3">
              <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-[#f97316]" /> 
              Alumni & Student Success
            </h1>
            <p className="text-blue-100 text-base md:text-lg max-w-3xl leading-relaxed">
              Celebrating the achievements of our outstanding graduates who continue to make us proud across Nepal and beyond.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/20 pt-8 mt-8">
            <div className="text-center md:border-r md:border-white/20 px-2">
              <div className="text-3xl md:text-4xl font-black mb-1">8+</div>
              <div className="text-xs font-bold text-blue-200 tracking-wider uppercase">Batches Graduated</div>
            </div>
            <div className="text-center md:border-r md:border-white/20 px-2">
              <div className="text-3xl md:text-4xl font-black mb-1">200+</div>
              <div className="text-xs font-bold text-blue-200 tracking-wider uppercase">Alumni Worldwide</div>
            </div>
            <div className="text-center md:border-r md:border-white/20 px-2">
              <div className="text-3xl md:text-4xl font-black mb-1">15+</div>
              <div className="text-xs font-bold text-blue-200 tracking-wider uppercase">District Toppers</div>
            </div>
            <div className="text-center px-2">
              <div className="text-3xl md:text-4xl font-black mb-1">📍</div>
              <div className="text-xs font-bold text-blue-200 tracking-wider uppercase">Serving Nepal & Beyond</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* SEARCH & FILTERS */}
        <div className="mb-10 space-y-4">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search alumni by name, batch, or profession..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 shadow-sm text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide flex-nowrap">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition border ${selectedCategory === cat ? 'bg-[#1a2744] text-white border-[#1a2744]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="md:ml-auto">
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => <option key={y} value={y}>{y === "All" ? "All Years" : y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* FEATURED ALUMNI */}
        {featuredAlumni.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-[#1a2744] mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-[#f97316] fill-[#f97316]" /> Featured Alumni
            </h2>
            <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory">
              {featuredAlumni.map((a) => (
                <div key={a.id} className={`snap-center shrink-0 w-[300px] md:w-[400px] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-l-4 ${getCategoryBorderStyles(a.category)} relative overflow-hidden flex flex-col group`}>
                   
                   {/* Admin Controls */}
                   {isAdmin && (
                     <div className="absolute top-2 right-2 flex gap-1 z-10 bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                       <button onClick={() => toggleFeatured(a.id)} className="p-1.5 hover:bg-yellow-50 rounded" title="Unfeature">
                         <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                       </button>
                       <button onClick={() => handleOpenModal(a)} className="p-1.5 hover:bg-blue-50 rounded" title="Edit">
                         <Edit2 className="w-4 h-4 text-blue-500" />
                       </button>
                       <button onClick={() => setDeleteId(a.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                         <Trash2 className="w-4 h-4 text-red-500" />
                       </button>
                     </div>
                   )}

                   <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 leading-tight">{a.name}</h3>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${getCategoryBadgeStyles(a.category)}`}>
                            {a.category}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm text-gray-600 mb-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                        <p className="flex items-start gap-2 max-w-full overflow-hidden">
                          <GraduationCap className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" /> 
                          <span className="truncate" title={`${a.batch} | GPA: ${a.seeBand}`}>
                            {a.batch} | GPA: {a.seeBand}
                          </span>
                        </p>
                        <p className="flex items-start gap-2 max-w-full overflow-hidden">
                          <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" /> 
                          <span className="truncate" title={`${a.currentStatus} \n ${a.organization}`}>
                            <span className="font-semibold text-gray-800">{a.currentStatus}</span><br/>
                            {a.organization}
                          </span>
                        </p>
                        <p className="flex items-start gap-2 max-w-full overflow-hidden">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" /> 
                          <span className="truncate" title={a.location}>{a.location}</span>
                        </p>
                      </div>

                      {a.achievement && (
                        <div className="bg-orange-50 border border-orange-100 text-orange-800 text-xs font-bold px-3 py-2 rounded-lg mb-4 flex items-center gap-2">
                          <Award className="w-4 h-4 text-orange-500 shrink-0" />
                          <span>{a.achievement}</span>
                        </div>
                      )}

                      <div className="mt-auto relative bg-gray-50 p-4 rounded-xl text-sm italic text-gray-600 mt-2">
                         <div className="text-4xl text-gray-300 font-serif leading-none absolute -top-2 -left-1">"</div>
                         <p className="relative z-10 pl-2 leading-relaxed limit-lines line-clamp-3">{a.quote}</p>
                         <p className="text-right font-semibold text-gray-800 mt-2 text-xs">— {a.name.split(' ')[0]}</p>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALL ALUMNI GRID */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-[#1a2744] mb-6">👥 All Alumni</h2>
          
          {filteredAlumni.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
               <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
               <p className="text-lg font-bold text-gray-500">No alumni records match your search.</p>
               <button onClick={() => {setSearch(''); setSelectedCategory('All'); setSelectedYear('All')}} className="mt-4 text-blue-600 font-bold hover:underline">Clear Filters</button>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlumni.map(a => (
                <div key={a.id} className={`bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-transform border-l-4 ${getCategoryBorderStyles(a.category)} flex flex-col relative`}>
                   
                   {/* Admin Controls */}
                   {isAdmin && (
                     <div className="absolute top-2 right-2 flex gap-1 z-10 bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                       <button onClick={() => toggleFeatured(a.id)} className="p-1.5 hover:bg-yellow-50 rounded" title={a.featured ? "Unfeature" : "Feature"}>
                         <Star className={`w-4 h-4 ${a.featured ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                       </button>
                       <button onClick={() => handleOpenModal(a)} className="p-1.5 hover:bg-blue-50 rounded" title="Edit">
                         <Edit2 className="w-4 h-4 text-blue-500" />
                       </button>
                       <button onClick={() => setDeleteId(a.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                         <Trash2 className="w-4 h-4 text-red-500" />
                       </button>
                     </div>
                   )}

                   <div className="p-5 flex-1 flex flex-col border-b border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-bold text-gray-900 leading-tight pr-6">{a.name}</h3>
                            <p className="text-xs text-gray-500 font-medium">{a.batch}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getCategoryBadgeStyles(a.category)}`}>
                          {a.category}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                          <div>
                            <p className="font-bold text-gray-800">{a.currentStatus}</p>
                            <p className="text-xs">{a.organization}</p>
                          </div>
                        </div>
                        {a.degree && (
                          <div className="flex items-start gap-2">
                            <GraduationCap className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                            <p className="text-xs">{a.degree}</p>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                          <p className="text-xs">{a.location}</p>
                        </div>
                      </div>

                      {a.achievement && (
                        <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-lg flex items-start gap-2 mt-auto">
                          <Award className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-orange-800 leading-tight">{a.achievement}</p>
                        </div>
                      )}
                   </div>
                   
                   {a.quote && (
                     <div className="bg-gray-50 px-5 py-3 rounded-b-xl">
                       <button 
                         onClick={() => toggleQuote(a.id)}
                         className="flex items-center justify-between w-full text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                       >
                         Read Quote <ChevronDown className={`w-4 h-4 transition-transform ${expandedQuotes[a.id] ? 'rotate-180' : ''}`} />
                       </button>
                       {expandedQuotes[a.id] && (
                         <div className="mt-3 text-sm italic text-gray-600 border-l-2 border-indigo-200 pl-3 py-1">
                           "{a.quote}"
                         </div>
                       )}
                     </div>
                   )}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM INSPIRE CARD */}
        <div className="bg-[#1a2744] rounded-2xl p-8 md:p-12 text-center text-white shadow-xl mb-12">
           <h2 className="text-2xl md:text-3xl font-black mb-4">Are you a Shikshantar Alumni?</h2>
           <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">Share your success story and inspire current students! We would love to feature your journey on our platform.</p>
           <a 
             href="mailto:shikshantar@school.edu.np?subject=Alumni Success Story Submission" 
             className="inline-flex items-center justify-center gap-2 bg-white text-[#1a2744] hover:bg-gray-100 px-8 py-4 rounded-xl font-black transition-colors w-full md:w-auto shadow-lg"
           >
             <Mail className="w-5 h-5" /> Share Your Story
           </a>
        </div>

        {/* ADMIN STATISTICS (Only visible to admin) */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-12">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-600" /> Alumni Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                 <p className="text-sm font-bold text-gray-500 uppercase">Total Alumni</p>
                 <p className="text-3xl font-black text-gray-900 mt-1">{stats.total}</p>
               </div>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                 <p className="text-sm font-bold text-gray-500 uppercase">Featured Profiles</p>
                 <p className="text-3xl font-black text-yellow-600 mt-1">{stats.featured}</p>
               </div>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 lg:col-span-2">
                 <p className="text-sm font-bold text-gray-500 uppercase mb-3">Categories Breakdown</p>
                 <div className="flex flex-wrap gap-2">
                   {Object.entries(stats.catCounts).map(([cat, count]) => (
                     <span key={cat} className={`px-2.5 py-1 rounded-md text-xs font-bold ${getCategoryBadgeStyles(cat)}`}>
                       {cat}: {count}
                     </span>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        )}

      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-900">{editingAlumnus ? 'Edit Alumni' : 'Add New Alumni'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category *</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none">
                    {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Batch / Graduation Year *</label>
                  <input type="text" placeholder="e.g. SEE Batch 2075" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SEE GPA / Percentage</label>
                  <input type="text" placeholder="e.g. 3.85 GPA" value={formData.seeBand} onChange={e => setFormData({...formData, seeBand: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Status / Role *</label>
                  <input type="text" placeholder="e.g. Engineer, Student" value={formData.currentStatus} onChange={e => setFormData({...formData, currentStatus: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Organization / College *</label>
                  <input type="text" placeholder="e.g. Nepal Electricity Authority" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Degree (Optional)</label>
                  <input type="text" placeholder="e.g. B.E. Civil Engineering" value={formData.degree} onChange={e => setFormData({...formData, degree: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                  <input type="text" placeholder="e.g. Kathmandu, Nepal" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Achievement (Highlight)</label>
                  <input type="text" placeholder="e.g. District Topper in SEE 2075" value={formData.achievement} onChange={e => setFormData({...formData, achievement: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quote to current students</label>
                  <textarea rows={3} value={formData.quote} onChange={e => setFormData({...formData, quote: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                </div>
                
                <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                   <div>
                     <p className="text-sm font-bold text-gray-900">Featured Alumni</p>
                     <p className="text-xs text-gray-500">Show this profile prominently at the top of the page</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} className="sr-only peer" />
                     <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                   </label>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a2744] hover:bg-[#25375f] transition shadow-md">
                Save Alumni
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Remove Alumni?</h3>
            <p className="text-sm font-medium text-gray-600 mb-6">
              Are you sure you want to completely remove this alumni record? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-3 text-sm font-black text-white bg-red-500 hover:bg-red-600 rounded-xl transition shadow-md"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
