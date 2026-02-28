import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let fired = false;
    
    // Auth initialization timeout (8000ms)
    const timeout = setTimeout(() => {
      if (!fired) {
        console.error("[AUTH_INIT_TIMEOUT] Auth initialization timed out.");
        setLoading(false);
        fired = true;
      }
    }, 8000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!fired) {
          clearTimeout(timeout);
          fired = true;
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Initial session check
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!fired) {
          clearTimeout(timeout);
          setSession(session);
          setUser(session?.user ?? null);
          fired = true;
        }
      } catch (error) {
        console.error("[AUTH_INIT_ERROR]", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    // Callback centralizado em app.omniseen.app para suporte a subdomínios
    // O return_to codifica a origem para redirecionamento final
    const returnTo = encodeURIComponent(window.location.origin + '/client/dashboard');
    const redirectTo = `https://app.omniseen.app/oauth/callback?return_to=${returnTo}`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) {
      console.error('Google OAuth error:', error);
      // Check for provider not enabled error
      if (error.message?.toLowerCase().includes('provider') || 
          error.message?.toLowerCase().includes('enabled') ||
          error.message?.toLowerCase().includes('not enabled')) {
        return { 
          error: new Error('Login com Google não está habilitado. Configure nas configurações do backend.') 
        };
      }
    }
    
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
