import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import api from "./api";
import { AppUser } from "./types";

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "yourtube_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  // Start "loading" true and only flip it false once Firebase has told us the
  // real auth state. This is the fix for issue #9: previously the app read
  // localStorage once on mount but never waited for / reconciled against
  // Firebase's own onAuthStateChanged callback, so a refresh could show a
  // flash of "logged out" or a stale user.
  const [loading, setLoading] = useState(true);

  async function syncMongoUser(fbUser: FirebaseUser) {
    const { data } = await api.post("/user/login", {
      email: fbUser.email,
      name: fbUser.displayName,
      image: fbUser.photoURL,
    });
    if (data?.success) {
      setUser(data.user);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      }
    }
  }

  useEffect(() => {
    // 1. Optimistically read any cached user so the UI doesn't flash
    //    "signed out" while Firebase is still initializing.
    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    }

    // 2. Let Firebase be the source of truth once it resolves.
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          await syncMongoUser(fbUser);
        } catch (err) {
          console.error("Failed to sync user with backend:", err);
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function loginWithGoogle() {
    // `onAuthStateChanged` above performs the MongoDB sync as soon as
    // Firebase completes the popup sign-in. Calling it here too races two
    // create-user requests against MongoDB's unique email index.
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Browsers can block an OAuth popup. Redirect sign-in is handled by the
      // same Firebase auth-state listener after the browser returns here.
      if ((err as { code?: string })?.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function refreshUser() {
    if (firebaseUser) {
      await syncMongoUser(firebaseUser);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, loginWithGoogle, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
