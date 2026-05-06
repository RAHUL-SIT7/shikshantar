import React, { useState, useEffect, useRef } from 'react';
import { Camera, Edit2, Lock, MonitorSmartphone, Shield, CheckCircle2, ChevronRight, CircleUserRound, Check, X, Activity, GraduationCap, LogOut, AlertCircle, Eye, EyeOff, FileText, Banknote, Settings } from 'lucide-react';
import { auth, db } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

export default function AdminProfileView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  
  // User data state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fullName, setFullName] = useState('Rahul Sah');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Male');
  
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  // Security state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminData = async () => {
      if (auth.currentUser) {
        try {
          setEmail(auth.currentUser.email || '');
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFullName(data.fullName || data.name || 'Rahul Sah');
            setPhone(data.phone || '');
            setDob(data.dob || '');
            setAddress(data.address || '');
            setGender(data.gender || 'Male');
            setAvatarUrl(data.avatarUrl || '');
          }
        } catch (e) {
          console.error("Error fetching admin profile", e);
        }

        try {
          // Fetch real recent activity from transactions
          const txSnap = await getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(15)));
          const txActs = txSnap.docs.map(d => ({ type: 'fee', id: d.id, ...d.data() }));
          
          setActivities(txActs);
        } catch(e) {
          // Ignore
        }
      }
      setLoading(false);
    };
    fetchAdminData();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    
    // Quick preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarUrl(objectUrl);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setAvatarUrl(downloadURL);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { avatarUrl: downloadURL });
      showToast('Profile photo updated successfully');
    } catch (err: any) {
      console.error("Error uploading photo", err);
      // fallback to original or show error?
      showToast('Error uploading photo');
    }
  };

  const handleSavePersonal = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        fullName,
        phone,
        dob,
        address,
        gender
      });
      setIsEditingPersonal(false);
      showToast('Personal information updated successfully');
    } catch (err: any) {
      console.error("Error saving profile", err);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found');
      if (!user.email) throw new Error('User email not found');
      if (!currentPassword) throw new Error('Current password is required');
      if (!newPassword) throw new Error('New password cannot be empty');
      if (newPassword !== confirmPassword) throw new Error('New passwords do not match');
      
      if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');
      if (!/[A-Z]/.test(newPassword)) throw new Error('New password must contain at least one uppercase letter');
      if (!/[a-z]/.test(newPassword)) throw new Error('New password must contain at least one lowercase letter');
      if (!/[0-9]/.test(newPassword)) throw new Error('New password must contain at least one number');

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await reauthenticateWithCredential(user, credential);
      } catch (authErr) {
        throw new Error('Current password does not match.');
      }

      await updatePassword(user, newPassword);
      
      showToast('Password updated successfully');
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    if (window.confirm("Are you sure you want to log out from all other devices? You will remain logged in on this device.")) {
       if (auth.currentUser) {
          try {
            const localSessionId = localStorage.getItem('localSessionId');
            if (localSessionId) {
               await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                  activeSessions: [localSessionId]
               });
               setSuccessToast('Successfully logged out from all other active sessions.');
            }
          } catch(e) {
             console.error(e);
             setPwdError('Failed to logout other devices. Please try again.');
          }
       }
       setTimeout(() => setSuccessToast(''), 4000);
    }
  };

  const getInitials = (nameStr: string) => {
    const parts = nameStr.split(' ').filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const evalPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$]/.test(pwd)) score--; // user requirement: no special character
    if (pwd.length > 12) score++;

    if (score <= 1) return { label: 'Weak 🔴', color: 'text-red-500' };
    if (score === 2) return { label: 'Fair 🟡', color: 'text-orange-500' };
    if (score === 3) return { label: 'Strong 🟢', color: 'text-emerald-500' };
    return { label: 'Very Strong 💪', color: 'text-emerald-600' };
  };

  const strength = evalPasswordStrength(newPassword);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Loading Profile...</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-500 relative">
      
      {/* Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          {successToast}
        </div>
      )}

      {/* SECTION 1 - HERO CARD */}
      <div className="bg-gradient-to-r text-primary text-primary rounded-2xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row items-start md:items-center gap-6 relative overflow-hidden mb-6">
         {/* Background decoration */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
         <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[#4f46e5]/20 rounded-full blur-3xl mb-[-100px] pointer-events-none"></div>

         {/* Avatar & Upload */}
         <div className="flex flex-col items-center gap-3 relative z-10 shrink-0">
           <div className="w-[100px] h-[100px] rounded-full border-4 border-white/20 bg-primary shadow-xl overflow-hidden flex items-center justify-center relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">{getInitials(fullName)}</span>
              )}
           </div>
           
           <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.png,.webp" onChange={handlePhotoUpload} />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-widest border border-white/30 rounded-full px-3 py-1.5 hover:bg-white/10 transition-colors"
           >
              <Camera className="w-3.5 h-3.5" /> Change Photo
           </button>
         </div>

         {/* Basic Info */}
         <div className="flex-1 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1">
               <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{fullName}</h1>
               <span className="bg-white border-primary text-primary text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full border border-gray-200 shadow-sm w-max">
                 ADMIN
               </span>
            </div>
            <p className="text-gray-300 font-medium text-sm mb-4">School Administrator • Shikshantar Academy | Siraha</p>

            {/* Status row */}
            <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-300">
               <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                 <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Active Session
               </div>
               <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                 <MonitorSmartphone className="w-3.5 h-3.5 text-blue-300" /> Last Login: Today, 3:17 PM
               </div>
               <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                 <Shield className="w-3.5 h-3.5 text-orange-300" /> Password updated 30 days ago
               </div>
            </div>
         </div>

         {/* Profile Completion (Desktop only) */}
         <div className="hidden lg:flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 relative z-10 shrink-0">
            <div className="w-20 h-20 relative flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90">
                 <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                 <circle cx="40" cy="40" r="36" fill="transparent" stroke="#10b981" strokeWidth="6" strokeDasharray="226" strokeDashoffset={226 - (226 * 0.75)} strokeLinecap="round" />
              </svg>
              <span className="absolute text-white font-black text-lg">75%</span>
            </div>
            <p className="text-xs text-white font-bold tracking-wide">Profile Complete</p>
            <p className="text-[10px] text-gray-400 mt-1">Add position to complete</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* SECTION 2 LEFT: Personal Info */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between text-primary">
             <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <CircleUserRound className="w-5 h-5 text-primary" /> Personal Information
             </h2>
             {!isEditingPersonal && (
               <button 
                 onClick={() => setIsEditingPersonal(true)}
                 className="text-xs font-bold border-primary text-primary hover:text-blue-700 flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
               >
                 <Edit2 className="w-3.5 h-3.5" /> Edit
               </button>
             )}
          </div>
          <div className="p-6 flex-1">
             {isEditingPersonal ? (
               <div className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                     <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                     <input type="email" value={email} readOnly className="w-full px-3 py-2 border-primary text-primary border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 outline-none cursor-not-allowed" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Date of Birth</label>
                        <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                     </div>
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                     <button onClick={handleSavePersonal} disabled={saving} className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save Changes'}
                     </button>
                     <button onClick={() => setIsEditingPersonal(false)} className="bg-white border border-gray-200 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-lg hover:text-primary transition-colors">
                        Cancel
                     </button>
                  </div>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-sm font-bold text-gray-900">{fullName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm font-bold text-gray-900">{email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-sm font-bold text-gray-900">{phone || '-'}</p>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date of Birth</p>
                     <p className="text-sm font-bold text-gray-900">{dob || '-'}</p>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gender</p>
                     <p className="text-sm font-bold text-gray-900">{gender}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-sm font-bold text-gray-900">{address || '-'}</p>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* SECTION 2 RIGHT: School Info */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between text-primary">
             <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> School Information
             </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 mb-auto">
               <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role</p>
                 <span className="text-xs font-bold border-primary text-primary bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase">Admin</span>
               </div>
               <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Employee ID</p>
                 <p className="text-sm font-bold text-gray-900">EMP-001</p>
               </div>
               <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Position</p>
                 <p className="text-sm font-bold text-gray-900">School Administrator</p>
               </div>
               <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department</p>
                 <p className="text-sm font-bold text-gray-900">Administration</p>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Joining Date</p>
                  <p className="text-sm font-bold text-gray-900">1 Shrawan 2080 B.S.</p>
               </div>
               <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Academic Year</p>
                 <p className="text-sm font-bold text-gray-900">2082-2083 B.S.</p>
               </div>
               <div className="col-span-full">
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reporting To</p>
                 <p className="text-sm font-bold text-gray-900">Principal</p>
               </div>
            </div>
            
            <div className="mt-8 bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex items-start gap-2">
               <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
               <p className="text-xs text-blue-800 font-medium leading-relaxed">
                 School information can only be updated by the Super Admin via the system console.
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SECURITY SETTINGS */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 text-primary">
           <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Security & Password
           </h2>
        </div>
        <div className="p-6">
           <div className="flex flex-col md:flex-row gap-8">
              {/* Left Side: Passwords */}
              <div className="flex-1">
                 <div className="mb-4">
                   <h3 className="text-sm font-bold text-gray-900 mb-1">Account Password</h3>
                   <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                     <p className="text-xs font-bold text-gray-500">Last changed: 30 days ago</p>
                   </div>
                 </div>

                 {!showPasswordSection ? (
                   <button 
                     onClick={() => setShowPasswordSection(true)} 
                     className="bg-white border border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg shadow-sm hover:text-primary transition-colors flex items-center gap-2"
                   >
                      <Lock className="w-4 h-4" /> Change Password
                   </button>
                 ) : (
                   <form onSubmit={handleUpdatePassword} className="border-primary text-primary border border-gray-100 p-5 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                      {pwdError && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                          {pwdError}
                        </div>
                      )}
                      <div className="space-y-1.5 relative">
                         <label className="text-[11px] font-bold text-gray-500 uppercase">Current Password</label>
                         <div className="relative">
                           <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                           <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                             {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                         </div>
                      </div>
                      <div className="space-y-1.5 relative">
                         <label className="text-[11px] font-bold text-gray-500 uppercase">New Password</label>
                         <div className="relative">
                           <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                           <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                             {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                         </div>
                         {newPassword && (
                           <div className="flex items-center justify-between pt-1">
                             <div className="flex gap-1">
                               <div className={`w-10 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                               <div className={`w-10 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                               <div className={`w-10 h-1.5 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                               <div className={`w-10 h-1.5 rounded-full ${/[!@#$]/.test(newPassword) ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                             </div>
                             <span className={`text-xs font-bold ${strength.color}`}>{strength.label}</span>
                           </div>
                         )}
                         <div className="bg-white p-3 rounded border border-gray-100 mt-2">
                           <ul className="text-[10px] space-y-1.5 font-bold text-gray-500">
                             <li className="flex gap-1.5"><Check className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? 'text-emerald-500' : 'text-gray-300'}`}/> At least 8 characters</li>
                             <li className="flex gap-1.5"><Check className={`w-3.5 h-3.5 ${/[A-Z]/.test(newPassword) ? 'text-emerald-500' : 'text-gray-300'}`}/> Contains uppercase letter</li>
                             <li className="flex gap-1.5"><Check className={`w-3.5 h-3.5 ${/[0-9]/.test(newPassword) ? 'text-emerald-500' : 'text-gray-300'}`}/> Contains number</li>
                             <li className="flex gap-1.5"><X className={`w-3.5 h-3.5 ${/[!@#$]/.test(newPassword) ? 'text-red-500' : 'text-gray-300'}`} /> Cannot contain special character (!@#$)</li>
                           </ul>
                         </div>
                      </div>
                      <div className="space-y-1.5 relative mb-4">
                         <label className="text-[11px] font-bold text-gray-500 uppercase">Confirm New Password</label>
                         <div className="relative">
                           <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-primary focus:ring-1 focus:ring-primary" />
                           <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                             {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                         </div>
                         {confirmPassword && newPassword === confirmPassword && (
                           <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1"><CheckCircle2 className="w-3.5 h-3.5"/> Passwords match</p>
                         )}
                      </div>
                      
                      <div className="pt-2 flex gap-3">
                         <button type="submit" disabled={pwdLoading || !newPassword || newPassword !== confirmPassword || /[!@#$]/.test(newPassword)} className="bg-primary text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-sm hover:bg-primary-dark transition-colors w-full disabled:opacity-50 flex items-center justify-center gap-2">
                            {pwdLoading ? 'Updating...' : 'Update Password'}
                         </button>
                         <button type="button" onClick={() => setShowPasswordSection(false)} className="bg-white border border-gray-200 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-lg hover:text-primary transition-colors">
                            Cancel
                         </button>
                      </div>
                   </form>
                 )}
              </div>
              
              {/* Spacer on Desktop */}
              <div className="hidden md:block w-px bg-gray-100"></div>

              {/* Right Side: Sessions */}
              <div className="flex-1 md:pt-0 pt-6 md:border-t-0 border-t border-gray-100">
                 <h3 className="text-sm font-bold text-gray-900 mb-4">Active Sessions</h3>
                 <div className="space-y-3">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-3 items-start">
                       <MonitorSmartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                       <div>
                          <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            Chrome on MacOS
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">This device</span>
                          </p>
                          <p className="text-xs text-gray-500 font-medium">Siraha, Nepal • Active now</p>
                       </div>
                    </div>
                 </div>

                 <button onClick={handleLogoutAllOtherDevices} className="mt-5 w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold px-4 py-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors">
                    <LogOut className="w-4 h-4" /> Logout All Other Devices
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* SECTION 4: RECENT ACTIVITY (Admin Only) */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 text-primary">
           <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Recent Activity
           </h2>
        </div>
        <div className="p-2 md:p-4">
           {/* Timeline */}
           <div className="relative pl-4 pr-4 py-2">
              <div className="absolute left-6 top-6 bottom-6 w-px bg-gray-200"></div>
              
              {activities.slice(0,5).map((act, i) => (
                <div className={`relative flex gap-4 items-start ${i < activities.slice(0,5).length - 1 ? 'mb-6' : ''}`} key={act.id}>
                   <div className="w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm shrink-0 mt-1 relative z-10"></div>
                   <div>
                     <p className="text-sm font-bold text-gray-800">Recorded fee payment for {act.studentName} (NRs. {(act.amount||0).toLocaleString()})</p>
                     <p className="text-[11px] font-bold text-gray-400 mt-0.5 uppercase">{act.date} • {act.method}</p>
                   </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-gray-500 font-bold text-sm text-center italic py-4">No recent activity found.</p>
              )}
           </div>
        </div>
        <div className="border-t border-gray-100 p-4">
           <button onClick={() => setIsActivityLogOpen(true)} className="text-sm font-bold text-primary hover:text-blue-700 flex items-center gap-1 mx-auto">
             View Full Activity Log <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* SECTION 5: QUICK STATS */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1 mb-3">Today's Quick Stats</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fees Recorded</p>
            <p className="text-xl md:text-2xl font-black text-gray-900">NRs. 3,600</p>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notices Posted</p>
            <p className="text-xl md:text-2xl font-black text-gray-900">4 <span className="text-xs text-gray-400 font-bold ml-1">/ month</span></p>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Admissions Appr.</p>
            <p className="text-xl md:text-2xl font-black text-gray-900">3</p>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Results Published</p>
            <p className="text-xl md:text-2xl font-black text-gray-900">2 <span className="text-xs text-gray-400 font-bold ml-1">exams</span></p>
         </div>
      </div>

      {isActivityLogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center text-primary shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Activity Log</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Your recent system actions</p>
                </div>
              </div>
              <button 
                onClick={() => setIsActivityLogOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
             <div className="p-6 overflow-y-auto space-y-6">
               <div className="relative border-l-2 border-gray-100 pl-6 ml-3 space-y-8">
                 {activities.length > 0 ? activities.map(act => (
                   <div className="relative" key={act.id}>
                      <div className="absolute -left-[31px] top-1 rounded-full border-4 border-white bg-emerald-500 p-1.5 shadow-sm">
                        <Banknote className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">Recorded fee payment of रू {(act.amount||0).toLocaleString()} for {act.studentName}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{act.date} • {act.method}</p>
                      </div>
                   </div>
                 )) : (
                   <p className="text-gray-500 font-bold text-sm text-center italic py-4">No recent activity found.</p>
                 )}
               </div>
             </div>
            <div className="px-6 py-4 text-primary border-t border-gray-100 flex justify-end shrink-0">
               <button 
                 onClick={() => setIsActivityLogOpen(false)}
                 className="px-5 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition-colors"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
