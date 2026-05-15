import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User, Phone, MapPin, Calendar, BookOpen, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
const logoImage = '/logo.png';

type Role = 'student' | 'teacher' | 'admin';
type View = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'register_otp';

export default function Login({ setIsAuthenticated }: { setIsAuthenticated: (val: boolean) => void }) {
  const [searchParams] = useSearchParams();
  const logoUrl = logoImage;
  const [view, setView] = useState<View>('login');
  const [role, setRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  
  // OTP State
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  // Registration specific fields
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [teachingLevel, setTeachingLevel] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [secretCode, setSecretCode] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const code = searchParams.get('oobCode');
    if (mode === 'resetPassword' && code) {
      setOobCode(code);
      setView('reset');
    }
  }, [searchParams]);

  const validatePhone = (num: string) => {
    return /^(98|97)\d{8}$/.test(num);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user data from firestore
      const userSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (userData.status === 'pending') {
          await signOut(auth);
          setError('Your account is pending admin approval. Please wait for an administrator to approve your account.');
          setLoading(false);
          return;
        }

        if (userData.children && userData.children.length > 0) {
          // Set primary child student ID to local storage automatically
          localStorage.setItem('studentId', userData.children[0].studentId);
          // BACKFILL studentIds if missing for legacy users
          if (!userData.studentIds) {
            const ids = userData.children.map((c: any) => c.studentId);
            try {
              await updateDoc(doc(db, 'users', userCredential.user.uid), { studentIds: ids });
            } catch (e) {
              console.warn("Failed to backfill studentIds:", e);
            }
          }
        }
        if (userData.role) {
          localStorage.setItem('userRole', userData.role);
        } else {
          localStorage.setItem('userRole', "student"); // Default
        }
      } else {
        if (email !== 'rahulsah4534@gmail.com') {
          await signOut(auth);
          setError('Your account has been deleted or disabled by the administrator.');
          setLoading(false);
          return;
        }
        localStorage.setItem('userRole', "admin");
      }

      localStorage.removeItem('isGuest');
      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      console.error("Login failed:", err);
      // Show actual error message if possible to help the user debug
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || String(err.message).includes('auth/invalid-credential')) {
         setError('Email or password is incorrect.');
      } else if (err.code === 'auth/network-request-failed' || String(err.message).includes('network-request-failed')) {
         setError('Network connection failed due to browser IndexedDB freeze or tracker-blocking. Please refresh the page, enable third-party cookies, or open the app in a new window to login.');
      } else if (err.code === 'auth/too-many-requests' || String(err.message).includes('too-many-requests')) {
         setError('Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.');
      } else {
         setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveStudentToFirestore = async (uid: string, isNewUser: boolean = false) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    let extractedRoll = '';
    const match = studentIdInput.match(/^SA\d+([A-Z]*\d*)*$/i);
    if (match) {
        const numPart = studentIdInput.replace(/^SA/i, '');
        let clsStr = studentClass || '';
        if (numPart.startsWith(clsStr)) {
            extractedRoll = numPart.substring(clsStr.length);
        } else if (numPart.startsWith('0' + clsStr)) {
            extractedRoll = numPart.substring(clsStr.length + 1);
        } else {
            extractedRoll = numPart;
        }
    } else {
        extractedRoll = studentIdInput;
    }

    const studentData = {
      name,
      fatherName,
      motherName,
      dob,
      studentClass,
      address,
      phone,
      studentId: studentIdInput,
      rollNumber: extractedRoll,
      rollNo: extractedRoll
    };

    if (userSnap.exists()) {
      await updateDoc(userRef, {
        children: arrayUnion(studentData),
        studentIds: arrayUnion(studentIdInput)
      });
    } else {
      await setDoc(userRef, {
        role: "student", // Force everyone to student by default on registration
        email: email,
        phone: phone,
        status: "pending", // New users go to pending state
        children: [studentData],
        studentIds: [studentIdInput],
        rollNumber: extractedRoll,
        rollNo: extractedRoll
      });
    }
  };

  const finalizeRegistration = async () => {
    setLoading(true);
    try {
      let isExistingUser = false;
      let userCredential;

      // Try creating new user
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use' || String(err.message).includes('auth/email-already-in-use')) {
          // It's a parent adding a 2nd/3rd child. Let's log them in and append!
          isExistingUser = true;
          try {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
          } catch (signInErr: any) {
            setError('Email already exists, but the password provided is incorrect. Please use your exact password to add another child.');
            setLoading(false);
            return;
          }
        } else {
          throw err;
        }
      }

      if (userCredential && userCredential.user) {
        await saveStudentToFirestore(userCredential.user.uid, !isExistingUser);
        
        if (!isExistingUser) {
           await signOut(auth);
           setMessage('Registration complete! Your account is pending admin approval. Please wait until your account is approved before logging in.');
           setTimeout(() => {
             setView('login');
           }, 3000);
           return;
        }

        // Temporarily store the latest StudentId in local storage for instant dashboard lookup
        if (studentIdInput) {
          localStorage.setItem('studentId', studentIdInput);
        }
        localStorage.setItem('userRole', "student");
        
        setMessage(isExistingUser ? 'New child added successfully to your account!' : 'Registration complete! Logging in...');
        
        setTimeout(() => {
          localStorage.removeItem('isGuest');
          setIsAuthenticated(true);
          navigate('/');
        }, 1500);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use' || String(err.message).includes('auth/email-already-in-use')) {
        setError('An account with this email address already exists. Please use a different email or log in.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network connection failed. Please check your internet connection or try disabling any ad-blockers/VPNs.');
      } else {
        setError(err.message || 'Failed to complete registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(otpCode);
        setMessage('Phone verified successfully! Finalizing account...');
        await finalizeRegistration();
      }
    } catch (err: any) {
      setError('Invalid OTP code. Please try again.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validatePasswordRule = (pass: string) => {
      if (pass.length < 8) return 'Password must be at least 8 characters long';
      if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
      if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
      if (!/[0-9]/.test(pass)) return 'Password must contain at least one number';
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain at least one special character';
      return null;
    };

    const passwordValidationError = validatePasswordRule(password);
    if (passwordValidationError) {
      setError(passwordValidationError);
      return;
    }

    if (!validatePhone(phone)) {
      setError('Phone number must be exactly 10 digits and start with 98 or 97');
      return;
    }

    if (!studentIdInput) {
      setError('Please provide a valid Student ID / Roll No');
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phone.startsWith('+') ? phone : `+977${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setMessage('OTP sent to your phone! Please complete verification to finish setting up.');
      setView('register_otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP for Registration Verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validatePasswordRule = (pass: string) => {
      if (pass.length < 8) return 'Password must be at least 8 characters long';
      if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
      if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
      if (!/[0-9]/.test(pass)) return 'Password must contain at least one number';
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain at least one special character';
      return null;
    };

    const passwordValidationError = validatePasswordRule(password);
    if (passwordValidationError) {
      setError(passwordValidationError);
      return;
    }

    if (!oobCode) {
      setError('Invalid or missing reset code.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage('Password has been reset successfully! You can now log in.');
      setTimeout(() => {
        setView('login');
        setPassword('');
        setConfirmPassword('');
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Phone number must be exactly 10 digits and start with 98 or 97');
      return;
    }

    setLoading(true);
    try {
      // Check if phone number exists in db
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No account is associated with this phone number.');
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const userRole = userData.role;
      if (!['student', 'teacher', 'admin'].includes(userRole)) {
         setError('This account does not have sufficient privileges.');
         setLoading(false);
         return;
      }

      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = phone.startsWith('+') ? phone : `+977${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setMessage('OTP sent to your phone!');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otpCode);
      setMessage('Phone verified successfully! You can now reset your password.');
      setView('reset');
    } catch (err: any) {
      setError('Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'verify') {
    return (
      <div className="flex items-center justify-center min-h-screen relative text-primary py-12 px-4 sm:px-6 lg:px-8">
        {/* Professional Background Pattern/Logo */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.35] pointer-events-none overflow-hidden">
        <motion.img 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          src={logoUrl} 
          alt="School Background Pattern" 
          className="w-[150%] max-w-[800px] h-auto object-contain drop-shadow-md sm:w-full"
        />
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key="verify"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-white/30 backdrop-blur-md rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/40 text-center relative z-10 mx-4"
        >
          <Mail className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Verify Your Email</h2>
          <p className="text-[#4b5563] mb-6">
            We have sent you a verification email to <span className="font-bold text-[#1f2937]">{email}</span>. Please verify it and log in.
          </p>
          <button
            onClick={() => {
              setView('login');
              setPassword('');
            }}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl hover:bg-primary-dark transition-all shadow-md active:scale-[0.98]"
          >
            Go to Login
          </button>
        </motion.div>
      </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative text-primary py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Professional Background Pattern/Logo */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.35] pointer-events-none overflow-hidden">
        <motion.img 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src={logoUrl} 
          alt="School Background Pattern" 
          className="w-[150%] max-w-[800px] h-auto object-contain drop-shadow-md sm:w-full"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[420px] bg-[#ffffff50] backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 relative z-10 transition-all overflow-hidden"
        >
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex items-center justify-center gap-3">
            <motion.img 
              initial={{ y: 0 }}
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              src={logoUrl} 
              alt="Shikshantar Academy Logo" 
              className="w-14 h-14 object-contain drop-shadow-md"
            />
            <div className="text-left flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-wide leading-tight drop-shadow-sm">Shikshantar Academy</h1>
              <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest drop-shadow-sm">Bastipur-5, Siraha</p>
            </div>
          </div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-black text-[#0f172a] tracking-tight mb-2 drop-shadow-sm"
          >
            {view === 'forgot' && 'Reset Password'}
            {view === 'reset' && 'Create New Password'}
            {(view === 'login' || view === 'register') && 'Welcome Back'}
          </motion.h2>
          <p className="text-sm text-[#64748b] mt-2 font-medium">
            {view === 'login' && 'Sign in to your account to continue'}
            {view === 'register' && 'Create your academy account'}
            {view === 'forgot' && 'Enter your email to receive a reset link'}
            {view === 'reset' && 'Enter your new password below'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-600 rounded-lg text-sm text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50/90 backdrop-blur-sm border border-green-200 text-green-700 rounded-lg text-sm text-center font-medium shadow-sm">
            {message}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 font-sans">
            <div>
              <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#94a3b8]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] bg-white/60 backdrop-blur-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#94a3b8]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] bg-white/60 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94a3b8] hover:text-primary focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end mt-2">
              <button 
                type="button" 
                onClick={() => { 
                  setView('forgot'); 
                  setError(''); 
                  setMessage(''); 
                }}
                className="text-xs text-primary hover:text-primary font-semibold transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl text-sm mt-6 hover:bg-primary-dark hover:shadow-lg hover:shadow-blue-900/20 transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? 'Please wait...' : `Login`}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                localStorage.setItem('isGuest', 'true');
                window.location.href = '/';
              }}
              className="mt-6 w-full flex items-center justify-center gap-3 bg-slate-100 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm border border-[#e2e8f0] hover:bg-slate-200 hover:border-[#cbd5e1] transition-all shadow-sm"
            >
              <User className="w-5 h-5 text-slate-500" />
              Continue as Guest User
            </motion.button>
          </form>
        )}

        {view === 'forgot' && (
          <div className="space-y-4 font-sans animate-in fade-in zoom-in duration-300">
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6 shadow-inner">
              <button
                type="button"
                onClick={() => { setResetMethod('email'); setError(''); setMessage(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${ resetMethod === 'email' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}
              >
                Reset via Email
              </button>
              <button
                type="button"
                onClick={() => { setResetMethod('phone'); setError(''); setMessage(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${ resetMethod === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700' }`}
              >
                Reset via SMS
              </button>
            </div>

            {resetMethod === 'email' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-[#94a3b8]" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] bg-white/60 backdrop-blur-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl text-sm mt-6 hover:bg-primary-dark hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <form onSubmit={confirmationResult ? handleVerifyOTP : handleSendPhoneOTP} className="space-y-4">
                <div id="recaptcha-container"></div>
                {!confirmationResult ? (
                  <>
                    <div>
                      <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-[#94a3b8]" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="block w-full pl-10 pr-3 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] bg-white/40 backdrop-blur-sm"
                          placeholder="98XXXXXXXX or 97XXXXXXXX"
                          maxLength={10}
                          pattern="^(98|97)\d{8}$"
                          title="Phone number must be exactly 10 digits and start with 98 or 97"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl text-sm mt-6 hover:bg-primary-dark hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">Enter OTP</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-[#94a3b8]" />
                        </div>
                        <input
                          type="text"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] font-bold tracking-widest text-center bg-white/40 backdrop-blur-sm"
                          placeholder="123456"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl text-sm mt-6 hover:bg-primary-dark hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </>
                )}
              </form>
            )}

            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setMessage(''); setConfirmationResult(null); }} 
                className="text-primary font-semibold text-sm flex items-center justify-center gap-1.5 mx-auto hover:text-primary-dark transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
          </div>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 font-sans animate-in fade-in zoom-in duration-300">
            <div className="bg-blue-50/50 rounded-xl p-4 mb-4 border border-blue-100 flex items-start gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Secure Your Account</h4>
                <p className="text-xs text-blue-700/80 mt-0.5 leading-relaxed">Please choose a strong password that you haven't used before. It must be at least 8 characters long.</p>
              </div>
            </div>

            <div>
              <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#94a3b8]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] bg-white/60 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94a3b8] hover:text-primary focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-[0.7rem] font-bold uppercase text-[#64748b] tracking-wider mb-1.5 ml-1">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#94a3b8]" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#e2e8f0] rounded-xl border-primary text-primary text-sm focus:outline-none focus:ring-primary focus:ring-4 focus:ring-primary transition-all text-[#0f172a] bg-white/60 backdrop-blur-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94a3b8] hover:text-primary focus:outline-none transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <ul className="text-[0.65rem] text-[#64748b] space-y-1.5 text-left font-medium">
                <li className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-300'}`}></div> Minimum 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${(/[A-Z]/.test(password) && /[a-z]/.test(password)) ? 'bg-green-500' : 'bg-slate-300'}`}></div> Uppercase & lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-1 h-1 rounded-full ${(/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) ? 'bg-green-500' : 'bg-slate-300'}`}></div> Number & special character
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-xl text-sm mt-6 hover:bg-primary-dark hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? 'Updating Password...' : 'Change Password'}
            </button>

            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setMessage(''); }} 
                className="text-primary font-semibold text-sm flex items-center justify-center gap-1.5 mx-auto hover:text-primary-dark transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="Enter full name" />
              </div>
            </div>

            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Father's Name</label>
              <input type="text" required value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="block w-full px-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="Father's name" />
            </div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Mother's Name</label>
              <input type="text" required value={motherName} onChange={(e) => setMotherName(e.target.value)} className="block w-full px-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="Mother's name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Date of Birth</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" />
                </div>
              </div>
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Class</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <select required value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm appearance-none">
                    <option value="" disabled>Select Class</option>
                    <option value="Playgroup">Playgroup</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num.toString()}>Class {num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Student ID / Roll No</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input type="text" required value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="Student ID (e.g. STU123)" />
              </div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="Full address" />
              </div>
            </div>

            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input 
                  type="tel" 
                  required 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" 
                  placeholder="98XXXXXXXX or 97XXXXXXXX" 
                  maxLength={10}
                  pattern="^(98|97)\d{8}$"
                  title="Phone number must be exactly 10 digits and start with 98 or 97"
                />
              </div>
            </div>

            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="Enter email" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-9 pr-10 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b7280] hover:text-primary focus:outline-none">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full pl-9 pr-10 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b7280] hover:text-primary focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <ul className="text-[0.65rem] text-[#6b7280] list-disc pl-4 mb-2 space-y-0.5 text-left mt-3">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase & lowercase letter</li>
              <li>At least one number & special character</li>
            </ul>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-primary-dark transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Registering...' : `Register Account`}
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.setItem('isGuest', 'true');
                window.location.href = '/';
              }}
              className="mt-3 w-full flex items-center justify-center gap-3 bg-slate-100 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm border border-[#e2e8f0] hover:bg-slate-200 hover:border-[#cbd5e1] transition-all shadow-sm active:scale-[0.98]"
            >
              <User className="w-5 h-5 text-slate-500" />
              Continue as Guest User
            </button>

            <p className="text-center text-sm text-[#475569] mt-6">
              Already have an account?{' '}
              <button type="button" onClick={() => { setView('login'); setError(''); }} className="text-primary font-semibold hover:text-primary hover:underline transition-colors">
                Sign in here
              </button>
            </p>
          </form>
        )}

        {view === 'register_otp' && (
          <form onSubmit={handleRegisterOtpVerify} className="space-y-4">
            <div id="recaptcha-container"></div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Enter Phone Verification OTP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-primary focus:ring-2 focus:ring-primary transition-all shadow-sm tracking-widest font-bold text-center"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">We sent a 6-digit code to {phone}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-primary-dark transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Verifying & Registering...' : 'Verify Phone & Register'}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('register'); setError(''); setMessage(''); setConfirmationResult(null); }} 
                className="text-primary font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel & Go Back
              </button>
            </div>
          </form>
        )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
