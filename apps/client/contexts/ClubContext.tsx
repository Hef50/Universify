import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Club, ClubMembership } from '@/types/club';
import * as clubsApi from '@/lib/clubs';
import { useAuth } from './AuthContext';

interface ClubContextType {
  clubs: Club[];
  isLoading: boolean;
  error: string | null;
  refreshClubs: () => Promise<void>;
  joinClub: (clubId: string, password?: string) => Promise<boolean>;
  leaveClub: (clubId: string) => Promise<boolean>;
  memberships: ClubMembership[];
  isLoadingMemberships: boolean;
  refreshMemberships: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<ClubMembership[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);

  const refreshClubs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clubsApi.fetchClubs(currentUser?.id);
      setClubs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load clubs');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  const joinClub = useCallback(
    async (clubId: string, password?: string): Promise<boolean> => {
      if (!currentUser) return false;
      try {
        const updatedClub = await clubsApi.joinClub(
          clubId,
          currentUser.id,
          password
        );
        setClubs((prev) =>
          prev.map((c) =>
            c.id === clubId
              ? {
                  ...c,
                  isMember: true,
                  memberCount: updatedClub.memberCount,
                  integrations: updatedClub.integrations,
                }
              : c
          )
        );
        return true;
      } catch (err: any) {
        throw err;
      }
    },
    [currentUser]
  );

  const leaveClub = useCallback(
    async (clubId: string): Promise<boolean> => {
      if (!currentUser) return false;
      try {
        await clubsApi.leaveClub(clubId, currentUser.id);
        setClubs((prev) =>
          prev.map((c) =>
            c.id === clubId
              ? {
                  ...c,
                  isMember: false,
                  memberCount: Math.max(0, c.memberCount - 1),
                  integrations: [],
                }
              : c
          )
        );
        return true;
      } catch (err: any) {
        throw err;
      }
    },
    [currentUser]
  );

  const refreshMemberships = useCallback(async () => {
    setIsLoadingMemberships(true);
    try {
      const data = await clubsApi.fetchAllMemberships();
      setMemberships(data);
    } catch (err: any) {
      console.error('Failed to fetch memberships:', err.message);
    } finally {
      setIsLoadingMemberships(false);
    }
  }, []);

  useEffect(() => {
    refreshClubs();
  }, [currentUser?.id]);

  return (
    <ClubContext.Provider
      value={{
        clubs,
        isLoading,
        error,
        refreshClubs,
        joinClub,
        leaveClub,
        memberships,
        isLoadingMemberships,
        refreshMemberships,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
};

export const useClubs = (): ClubContextType => {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClubs must be used within a ClubProvider');
  }
  return context;
};
