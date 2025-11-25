import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  role: 'user' | 'admin' | 'instructor';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect for fetching profile when user state changes
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching profile:", error);
            setProfile(null);
          } else {
            setProfile(data);
          }
        });
    } else {
      setProfile(null);
    }
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle setting user and profile to null
  };

  const refreshProfile = async () => {
    if (user) {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error refreshing profile:", error);
        setProfile(null);
      } else {
        setProfile(userProfile);
      }
    }
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};