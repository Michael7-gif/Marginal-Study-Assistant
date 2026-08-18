import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, signup as signupRequest } from '../services/authService';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { getCurrentUser().then(r => setUser(r.data)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({ user, loading,
    async login(email,password){const r=await loginRequest(email,password);setUser(r.data);return r.data;},
    async signup(email,password){const r=await signupRequest(email,password);setUser(r.data);return r.data;},
    async logout(){await logoutRequest().catch(()=>{});setUser(null);localStorage.removeItem('studydesk_current_document_id');}
  }), [user,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext);}