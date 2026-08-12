import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '@/types/user';
import { DEV_ACCOUNTS } from '@/constants/devAccounts';
import { storage } from '@/lib/storage';

/**
 * Dev mode: a password-gated set of testing tools.
 *
 * The password ships in the client bundle, so this is a convenience latch —
 * it keeps casual visitors out of test features, nothing more. Everything
 * dev mode unlocks is client-local: mock sign-in personas, theme toggles,
 * local data seeding/reset. It can never touch real user data.
 */

const DEV_MODE_PASSWORD = 'dev50';
const DEV_MODE_KEY = 'universify_dev_mode';
const DEV_USER_KEY = 'universify_dev_user';

interface DevModeContextType {
  /** True once the password has been entered on this device */
  isDevMode: boolean;
  /** The currently signed-in test persona, if any */
  devUser: User | null;
  /** True until stored dev state has been loaded */
  isHydrating: boolean;
  enableDevMode: (password: string) => boolean;
  disableDevMode: () => void;
  signInAsDevUser: (accountId: string) => void;
  signOutDevUser: () => void;
}

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export const DevModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState(false);
  const [devUser, setDevUser] = useState<User | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [mode, userId] = await Promise.all([
          storage.getItem(DEV_MODE_KEY),
          storage.getItem(DEV_USER_KEY),
        ]);
        if (mode === '1') {
          setIsDevMode(true);
          if (userId) {
            const account = DEV_ACCOUNTS.find((a) => a.user.id === userId);
            if (account) setDevUser(account.user);
          }
        }
      } catch {
        // Fresh state on storage failure
      } finally {
        setIsHydrating(false);
      }
    })();
  }, []);

  const enableDevMode = useCallback((password: string): boolean => {
    if (password !== DEV_MODE_PASSWORD) return false;
    setIsDevMode(true);
    storage.setItem(DEV_MODE_KEY, '1').catch(() => {});
    return true;
  }, []);

  const disableDevMode = useCallback(() => {
    setIsDevMode(false);
    setDevUser(null);
    storage.removeItem(DEV_MODE_KEY).catch(() => {});
    storage.removeItem(DEV_USER_KEY).catch(() => {});
  }, []);

  const signInAsDevUser = useCallback((accountId: string) => {
    const account = DEV_ACCOUNTS.find((a) => a.user.id === accountId);
    if (!account) return;
    setDevUser(account.user);
    storage.setItem(DEV_USER_KEY, accountId).catch(() => {});
  }, []);

  const signOutDevUser = useCallback(() => {
    setDevUser(null);
    storage.removeItem(DEV_USER_KEY).catch(() => {});
  }, []);

  const value: DevModeContextType = {
    isDevMode,
    devUser,
    isHydrating,
    enableDevMode,
    disableDevMode,
    signInAsDevUser,
    signOutDevUser,
  };

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
};

export const useDevMode = (): DevModeContextType => {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
};
