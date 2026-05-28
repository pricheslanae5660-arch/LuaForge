import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

type PlanTier = 'free' | 'pro' | 'premium';

interface UserData {
  tier: PlanTier;
  generationsUsed: number;
  chatUsed: number;
  resetsAt: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true, refreshUserData: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

    const fetchUserData = async (uid: string, retryCount = 0) => {
    try {
      const userDoc = doc(db, 'users', uid);
      const snap = await getDoc(userDoc);
      if (snap.exists()) {
        setUserData(snap.data() as UserData);
      } else {
        const newData: UserData = {
          tier: 'free',
          generationsUsed: 0,
          chatUsed: 0,
          resetsAt: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        await setDoc(userDoc, newData);
        setUserData(newData);
      }
    } catch (e: any) {
      if (e.message?.includes('offline')) {
        console.warn('Client offline, using fallback user data.');
      } else {
        console.warn('Failed to fetch/set user data:', e);
      }
      // Fallback data if offline or failing
      setUserData({
        tier: 'free',
        generationsUsed: 0,
        chatUsed: 0,
        resetsAt: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchUserData(u.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData: async () => { if(user) await fetchUserData(user.uid); } }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
