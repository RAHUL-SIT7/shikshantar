import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Facilities from './pages/Facilities';
import Gallery from './pages/Gallery';
import Events from './pages/Events';
import Account from './pages/Account';
import AccountAdmin from './pages/AccountAdmin';
import Result from './pages/Result';
import Login from './pages/Login';
import Admin from './pages/Admin';
import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
        <Route path="/" element={<Layout isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="events" element={<Events />} />
          <Route 
            path="account" 
            element={isAuthenticated ? <Account /> : <Navigate to="/login" />} 
          />
          <Route 
            path="account-admin" 
            element={isAuthenticated ? <AccountAdmin /> : <Navigate to="/login" />} 
          />
          <Route 
            path="result" 
            element={isAuthenticated ? <Result /> : <Navigate to="/login" />} 
          />
          <Route 
            path="admin" 
            element={isAuthenticated ? <Admin /> : <Navigate to="/login" />} 
          />
        </Route>
      </Routes>
    </Router>
  );
}
