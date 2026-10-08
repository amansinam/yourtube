import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User as FirebaseUser } from "firebase/auth";
import { AxiosError } from "axios";
import { auth, googleProvider } from "./firebase";
import api from "./api";
import { AppUser } from "./types";
interface AuthValue { user: AppUser | null; firebaseUser: FirebaseUser | null; loading: boolean; otpChallenge: { challengeId: string } | null; loginError: string | null; loginWithGoogle: () => Promise<void>; verifyOtp: (code: string, trust: boolean) => Promise<void>; logout: () => Promise<void>; refreshUser: () => Promise<void>; }
const AuthContext = createContext<AuthValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
 const [user,setUser]=useState<AppUser|null>(null),[firebaseUser,setFirebaseUser]=useState<FirebaseUser|null>(null),[loading,setLoading]=useState(true),[otpChallenge,setOtpChallenge]=useState<{challengeId:string}|null>(null),[loginError,setLoginError]=useState<string|null>(null);
 const authHeader=async(fb:FirebaseUser)=>({Authorization:`Bearer ${await fb.getIdToken()}`});
 async function restoreSession(fb:FirebaseUser){const {data}=await api.get("/user/session",{headers:await authHeader(fb)});setUser(data.user);setOtpChallenge(null);}
 async function begin(fb:FirebaseUser){
   try { await restoreSession(fb); return; }
   catch (error) { const status=(error as AxiosError).response?.status; if (status !== 401 && status !== 403) throw error; }
   const {data}=await api.post("/user/login",{}, {headers:await authHeader(fb)});
   if(data.authenticated){setUser(data.user);setOtpChallenge(null);}else if(data.otpRequired)setOtpChallenge({challengeId:data.challengeId});
 }
 const message=(error:unknown)=>((error as AxiosError<{message?:string}>).response?.data?.message || "Secure sign-in could not start. Please try again.");
 useEffect(()=>onAuthStateChanged(auth,async fb=>{setFirebaseUser(fb);setUser(null);setOtpChallenge(null);setLoginError(null);if(fb)try{await begin(fb);}catch(error){console.error("Secure sign-in could not start",error);setLoginError(message(error));}setLoading(false);}),[]);
 async function loginWithGoogle(){try{await signInWithPopup(auth,googleProvider);}catch(e){if((e as {code?:string}).code==="auth/popup-blocked")return signInWithRedirect(auth,googleProvider);throw e;}}
 async function verifyOtp(code:string,trust:boolean){if(!firebaseUser||!otpChallenge)throw new Error("No verification pending");const {data}=await api.post("/user/verify-otp",{challengeId:otpChallenge.challengeId,code,trustDevice:trust},{headers:await authHeader(firebaseUser)});setUser(data.user);setOtpChallenge(null);setLoginError(null);}
 async function logout(){try{await api.post("/user/logout");}finally{await signOut(auth);setUser(null);setOtpChallenge(null);setLoginError(null);}}
 async function refreshUser(){if(!firebaseUser)return;try{await restoreSession(firebaseUser);}catch(error){setLoginError(message(error));throw error;}}
 return <AuthContext.Provider value={{user,firebaseUser,loading,otpChallenge,loginError,loginWithGoogle,verifyOtp,logout,refreshUser}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error("useAuth must be used within an AuthProvider");return ctx;}
