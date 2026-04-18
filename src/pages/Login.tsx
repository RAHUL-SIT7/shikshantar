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
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

type Role = 'student' | 'teacher' | 'admin';
type View = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'register_otp';

export default function Login({ setIsAuthenticated }: { setIsAuthenticated: (val: boolean) => void }) {
  const [searchParams] = useSearchParams();
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
        if (userData.children && userData.children.length > 0) {
          // Set primary child student ID to local storage automatically
          localStorage.setItem('studentId', userData.children[0].studentId);
        }
        if (userData.role) {
          localStorage.setItem('userRole', userData.role);
        } else {
          localStorage.setItem('userRole', role);
        }
      } else {
        localStorage.setItem('userRole', role);
      }

      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      setError('Email or password is incorrect');
    } finally {
      setLoading(false);
    }
  };

  const saveStudentToFirestore = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const studentData = {
      name,
      fatherName,
      motherName,
      dob,
      studentClass,
      address,
      phone,
      studentId: studentIdInput
    };

    if (userSnap.exists()) {
      await updateDoc(userRef, {
        children: arrayUnion(studentData)
      });
    } else {
      await setDoc(userRef, {
        role: role,
        email: email,
        phone: phone,
        children: [studentData]
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
        if (err.code === 'auth/email-already-in-use') {
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
        await saveStudentToFirestore(userCredential.user.uid);
        
        // Temporarily store the latest StudentId in local storage for instant dashboard lookup
        if (studentIdInput) {
          localStorage.setItem('studentId', studentIdInput);
        }
        localStorage.setItem('userRole', role);
        
        setMessage(isExistingUser ? 'New child added successfully to your account!' : 'Registration complete! Logging in...');
        
        setTimeout(() => {
          setIsAuthenticated(true);
          navigate('/');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
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

    if (role === 'student' && !studentIdInput) {
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

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      localStorage.setItem('userRole', role);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
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
    setLoading(true);
    try {
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
      <div className="flex items-center justify-center min-h-screen relative bg-[#f8fafc]">
        {/* Professional Background Pattern/Logo */}
        <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center opacity-[0.03]">
          <img 
            src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" 
            alt="School Background Pattern" 
            className="w-full max-w-[800px] object-contain"
          />
        </div>
        <div className="w-full max-w-md bg-white backdrop-blur-md rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-[#e2e8f0] text-center relative z-10 mx-4">
          <Mail className="w-16 h-16 text-[#1e3a8a] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Verify Your Email</h2>
          <p className="text-[#4b5563] mb-6">
            We have sent you a verification email to <span className="font-bold text-[#1f2937]">{email}</span>. Please verify it and log in.
          </p>
          <button
            onClick={() => {
              setView('login');
              setPassword('');
            }}
            className="w-full bg-[#1e3a8a] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#1e40af] transition-all shadow-md active:scale-[0.98]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8">
      {/* Professional Background Pattern/Logo */}
      <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center opacity-[0.03] pointer-events-none">
        <img 
          src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" 
          alt="School Background Pattern" 
          className="w-[120%] max-w-[1000px] object-contain"
        />
      </div>

      <div className="w-full max-w-[440px] bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-[#e2e8f0] relative z-10 transition-all">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex flex-col items-center justify-center">
            <img 
              src="https://scontent-bom5-2.xx.fbcdn.net/v/t39.30808-1/449434102_992784866187268_1459281150796232207_n.jpg?stp=dst-jpg_p120x120_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=1pELfyAs9iEQ7kNvwFKGlth&_nc_oc=Ado3AXGnO1tkaDoFFHD0b_RbyaDvwKJrUS3JXWUZpaNypo5PhqMDsre9ZEdlR0eyAAI&_nc_zt=24&_nc_ht=scontent-bom5-2.xx&_nc_gid=cSgG0s_7KYKgIQNALay2mg&_nc_ss=7a3a8&oh=00_Af3Q_Aa79RcWHN6hbfJop6RWm79F0m9oZilwAypG0k7-HQ&oe=69E68DAE" 
              alt="Shikshantar Academy Logo" 
              className="w-20 h-20 object-contain drop-shadow-md"
            />
            <h1 className="text-xl font-black text-[#1e3a8a] uppercase tracking-wide mt-2">Shikshantar Academy</h1>
          </div>
          <h2 className="text-[1.1rem] sm:text-lg font-bold text-[#0f172a] tracking-tight">
            {view === 'forgot' && 'Reset Password'}
            {view === 'reset' && 'Create New Password'}
            {(view === 'login' || view === 'register') && 'Welcome back, please sign in'}
          </h2>
          <p className="text-sm text-[#64748b] mt-1.5 font-medium">
            {view === 'login' && 'Sign in to your account to continue'}
            {view === 'register' && 'Create your academy account'}
            {view === 'forgot' && 'Enter your email to receive a reset link'}
            {view === 'reset' && 'Enter your new password below'}
          </p>
        </div>

        {/* Role Selector (only for login and register) */}
        {(view === 'login' || view === 'register') && (
          <div className="flex p-1 bg-[#f1f5f9] rounded-xl mb-7 border border-[#e2e8f0]">
            {(['student', 'teacher', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-[0.8rem] sm:text-sm font-semibold rounded-lg capitalize transition-all duration-200 ${
                  role === r 
                    ? 'bg-white text-[#1e3a8a] shadow-[0_1px_3px_rgba(0,0,0,0.1)]' 
                    : 'text-[#64748b] hover:text-[#334155]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

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
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#e2e8f0] rounded-xl bg-[#f8fafc] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10 transition-all text-[#0f172a]"
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
                  className="block w-full pl-10 pr-10 py-2.5 border border-[#e2e8f0] rounded-xl bg-[#f8fafc] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-4 focus:ring-[#1e3a8a]/10 transition-all text-[#0f172a]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94a3b8] hover:text-[#1e3a8a] focus:outline-none transition-colors"
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
                className="text-xs text-[#1e3a8a] hover:text-[#1e40af] font-semibold transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a8a] text-white font-semibold py-3 px-4 rounded-xl text-sm mt-6 hover:bg-[#1e40af] hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? 'Please wait...' : `Sign in as ${role}`}
            </button>

            <div className="mt-8 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e2e8f0]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-[#64748b] font-medium uppercase tracking-wider">Or continue with</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-6 w-full flex items-center justify-center gap-3 bg-white text-[#334155] font-semibold py-2.5 px-4 rounded-xl text-sm border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>
            </div>

            <p className="text-center text-sm text-[#475569] mt-6">
              Don't have an account?{' '}
              <button type="button" onClick={() => { setView('register'); setError(''); }} className="text-[#1e3a8a] font-semibold hover:text-[#1e40af] hover:underline transition-colors">
                Register here
              </button>
            </p>
          </form>
        )}

        {view === 'forgot' && (
          <div className="space-y-4">
            <div className="flex p-1 bg-white/50 backdrop-blur-sm rounded-lg mb-6 border border-white/40 shadow-inner">
              <button
                type="button"
                onClick={() => { setResetMethod('email'); setError(''); setMessage(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all ${
                  resetMethod === 'email' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-[#4b5563] hover:text-[#1f2937]'
                }`}
              >
                Reset via Email
              </button>
              <button
                type="button"
                onClick={() => { setResetMethod('phone'); setError(''); setMessage(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-md capitalize transition-all ${
                  resetMethod === 'phone' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-[#4b5563] hover:text-[#1f2937]'
                }`}
              >
                Reset via Phone OTP
              </button>
            </div>

            {resetMethod === 'email' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-[#6b7280]" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                      placeholder="Enter email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a8a] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-70 shadow-md"
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
                      <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-[#6b7280]" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                          placeholder="98XXXXXXXX"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#1e3a8a] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#1e3a8a]/90 transition-colors disabled:opacity-70 shadow-md"
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Enter OTP</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-[#6b7280]" />
                        </div>
                        <input
                          type="text"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm tracking-widest font-bold"
                          placeholder="123456"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </>
                )}
              </form>
            )}

            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setMessage(''); setConfirmationResult(null); }} 
                className="text-[#1e3a8a] font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
            
            {/* Demo link to show the reset password UI if they don't have a real code */}
            <div className="mt-6 pt-4 border-t border-gray-200/50 text-center">
              <p className="text-xs text-gray-500 mb-2">Have a reset code?</p>
              <button 
                type="button" 
                onClick={() => { setView('reset'); setError(''); setMessage(''); }} 
                className="text-xs text-[#f97316] font-bold hover:underline"
              >
                Enter New Password Directly
              </button>
            </div>
          </div>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b7280] hover:text-[#1e3a8a] focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#6b7280]" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b7280] hover:text-[#1e3a8a] focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <ul className="text-[0.65rem] text-[#6b7280] list-disc pl-4 mb-2 space-y-0.5 text-left">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase & lowercase letter</li>
              <li>At least one number & special character</li>
            </ul>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>

            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setMessage(''); }} 
                className="text-[#1e3a8a] font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline"
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
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Enter full name" />
              </div>
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Father's Name</label>
                  <input type="text" required value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="block w-full px-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Father's name" />
                </div>
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Mother's Name</label>
                  <input type="text" required value={motherName} onChange={(e) => setMotherName(e.target.value)} className="block w-full px-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Mother's name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Date of Birth</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-[#6b7280]" />
                      </div>
                      <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Class</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BookOpen className="h-4 w-4 text-[#6b7280]" />
                      </div>
                      <select required value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm appearance-none">
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
                    <input type="text" required value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Student ID (e.g. STU123)" />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-[#6b7280]" />
                    </div>
                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Full address" />
                  </div>
                </div>
              </>
            )}

            {role === 'teacher' && (
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Teaching Level</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <select required value={teachingLevel} onChange={(e) => setTeachingLevel(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm appearance-none">
                    <option value="" disabled>Select Level</option>
                    <option value="Pre-Primary">Pre-Primary</option>
                    <option value="Primary">Primary</option>
                    <option value="Lower Secondary">Lower Secondary</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                </div>
              </div>
            )}

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
                  className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" 
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
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-9 pr-3 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="Enter email" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.75rem] font-bold uppercase text-[#4b5563] mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#6b7280]" />
                  </div>
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-9 pr-10 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b7280] hover:text-[#1e3a8a] focus:outline-none">
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
                  <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full pl-9 pr-10 py-2 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b7280] hover:text-[#1e3a8a] focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <ul className="text-[0.65rem] text-[#6b7280] list-disc pl-4 mb-2 space-y-0.5 text-left">
              <li>Minimum 8 characters</li>
              <li>At least one uppercase & lowercase letter</li>
              <li>At least one number & special character</li>
            </ul>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Registering...' : `Register as ${role}`}
            </button>

            <div className="mt-8 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e2e8f0]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-[#64748b] font-medium uppercase tracking-wider">Or register with</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-6 w-full flex items-center justify-center gap-3 bg-white text-[#334155] font-semibold py-2.5 px-4 rounded-xl text-sm border border-[#e2e8f0] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>
            </div>

            <p className="text-center text-sm text-[#475569] mt-6">
              Already have an account?{' '}
              <button type="button" onClick={() => { setView('login'); setError(''); }} className="text-[#1e3a8a] font-semibold hover:text-[#1e40af] hover:underline transition-colors">
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
                  className="block w-full pl-9 pr-3 py-2.5 border border-white/60 rounded-lg bg-white/60 backdrop-blur-sm text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 transition-all shadow-sm tracking-widest font-bold text-center"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">We sent a 6-digit code to {phone}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f97316] text-white font-bold py-2.5 px-4 rounded-lg text-sm mt-4 hover:bg-[#ea580c] transition-colors disabled:opacity-70 shadow-md"
            >
              {loading ? 'Verifying & Registering...' : 'Verify Phone & Register'}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setView('register'); setError(''); setMessage(''); setConfirmationResult(null); }} 
                className="text-[#1e3a8a] font-bold text-sm flex items-center justify-center gap-1 mx-auto hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel & Go Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
