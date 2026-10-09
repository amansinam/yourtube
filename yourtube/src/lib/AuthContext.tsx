import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User as FirebaseUser } from "firebase/auth";
import { AxiosError } from "axios";
import { auth, googleProvider } from "./firebase";
import api from "./api";
import { AppUser } from "./types";
interface AuthValue { user: AppUser | null; firebaseUser: FirebaseUser | null; loading: boolean; loginError: string | null; loginWithGoogle: () => Promise<void>; logout: () => Promise<void>; refreshUser: () => Promise<void>; }
const AuthContext = createContext<AuthValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
 const [user,setUser]=useState<AppUser|null>(null),[firebaseUser,setFirebaseUser]=useState<FirebaseUser|null>(null),[loading,setLoading]=useState(true),[loginError,setLoginError]=useState<string|null>(null);
 const popupFlow=useRef(false);
 const authHeader=async(fb:FirebaseUser)=>({Authorization:`Bearer ${await fb.getIdToken()}`});
 async function restoreSession(fb:FirebaseUser){const {data}=await api.get("/user/session",{headers:await authHeader(fb)});setUser(data.user);}
 async function begin(fb:FirebaseUser){
   try { await restoreSession(fb); return; }
   catch (error) { const status=(error as AxiosError).response?.status; if (status !== 401 && status !== 403) throw error; }
   const {data}=await api.post("/user/login",{}, {headers:await authHeader(fb)});
   if(!data.authenticated||!data.user)throw new Error("The backend did not complete Google sign-in. Please try again.");
   setUser(data.user);
 }
 const message=(error:unknown)=>{
   const requestError=error as AxiosError<{message?:string}>;
   if(requestError.response?.data?.message)return requestError.response.data.message;
   if(requestError.isAxiosError&&!requestError.response)return "Could not reach the sign-in server. Check NEXT_PUBLIC_BACKEND_URL and the backend's CORS configuration.";
   if(error instanceof Error)return error.message;
   return "Secure sign-in could not start. Please try again.";
 };
 const firebaseMessage=(error:unknown)=>{const code=(error as {code?:string}).code; const messages:Record<string,string>={"auth/invalid-api-key":"The Firebase web API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY.","auth/unauthorized-domain":"This website domain is not authorized in Firebase Authentication.","auth/popup-blocked":"Your browser blocked the sign-in popup. Allow popups and try again.","auth/popup-closed-by-user":"Sign-in was cancelled before it was completed.","auth/operation-not-allowed":"Google sign-in is not enabled in Firebase Authentication.","auth/network-request-failed":"Network connection failed while contacting Firebase."}; return messages[code||""] || "Google sign-in could not start. Please try again.";};
 useEffect(()=>{
   const unsubscribe=onAuthStateChanged(auth,async fb=>{
     if(popupFlow.current){
       if(fb)setFirebaseUser(fb);
       return;
     }
     setFirebaseUser(fb);setUser(null);setLoginError(null);
     if(fb){
       try{await begin(fb);}
       catch(error){console.error("Secure sign-in could not start",error);setLoginError(message(error));}
       finally{setLoading(false);}
     }else setLoading(false);
   });
   return unsubscribe;
 },[]);
 async function loginWithGoogle(){
   setLoginError(null);
   if(auth.currentUser){
     setLoading(true);
     try{await begin(auth.currentUser);}
     catch(error){console.error("Secure sign-in could not start",error);setLoginError(message(error));}
     finally{setLoading(false);}
     return;
   }
   popupFlow.current=true;
   setLoading(true);
   try{
     let fb:FirebaseUser;
     try{({user:fb}=await signInWithPopup(auth,googleProvider));}
     catch(error){
       if((error as {code?:string}).code==="auth/popup-blocked"){
         try{await signInWithRedirect(auth,googleProvider);return;}
         catch(redirectError){setLoginError(firebaseMessage(redirectError));return;}
       }
       setLoginError(firebaseMessage(error));
       return;
     }
     setFirebaseUser(fb);
     try{await begin(fb);}
     catch(error){console.error("Secure sign-in could not start",error);setLoginError(message(error));}
   }finally{
     popupFlow.current=false;
     setLoading(false);
   }
 }
 async function logout(){try{await api.post("/user/logout");}finally{await signOut(auth);setUser(null);setLoginError(null);}}
 async function refreshUser(){if(!firebaseUser)return;try{await restoreSession(firebaseUser);}catch(error){setLoginError(message(error));throw error;}}
 return <AuthContext.Provider value={{user,firebaseUser,loading,loginError,loginWithGoogle,logout,refreshUser}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error("useAuth must be used within an AuthProvider");return ctx;}
