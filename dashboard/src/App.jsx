import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged } from './firebase';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard user={user} />;
}
