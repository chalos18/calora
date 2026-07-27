import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "calora.userId";

/**
 * Who is using the app.
 *
 * Persisted, so a page reload on web or a relaunch on a phone does not drop
 * you back into onboarding with your diary apparently empty.
 *
 * Calora runs single-user today but is shaped multi-tenant throughout: every
 * request carries a user id, so adding real accounts later is additive rather
 * than a rewrite. This is a stand-in for auth, not auth.
 */
interface Session {
  userId: string | null;
  /** False until the stored id has been read; screens wait rather than flash. */
  isReady: boolean;
  setUserId: (userId: string) => void;
}

const SessionContext = createContext<Session | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserIdState] = useState<string | null>(
    process.env.EXPO_PUBLIC_USER_ID ?? null,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored) setUserIdState(stored);
      })
      .catch(() => {
        // A storage failure should not block the app; it just means the user
        // signs in again.
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setUserId = (next: string) => {
    setUserIdState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <SessionContext.Provider value={{ userId, isReady, setUserId }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): Session => {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession used outside SessionProvider");
  return session;
};
