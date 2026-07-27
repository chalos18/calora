import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Who is using the app.
 *
 * Calora runs single-user today but is shaped multi-tenant throughout: every
 * request carries a user id, so adding real accounts later is additive rather
 * than a rewrite. Persisting this belongs with real auth, not here.
 */
interface Session {
  userId: string | null;
  setUserId: (userId: string) => void;
}

const SessionContext = createContext<Session | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(
    process.env.EXPO_PUBLIC_USER_ID ?? null,
  );

  return (
    <SessionContext.Provider value={{ userId, setUserId }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): Session => {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession used outside SessionProvider");
  return session;
};
