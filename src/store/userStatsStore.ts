import { create } from 'zustand';
import { getRepository } from '../data';
import { UserStats } from '../data/types';

interface UserStatsState {
  stats: UserStats | null;
  loading: boolean;
  refreshStats: () => Promise<UserStats>;
  updateStats: (updates: Partial<UserStats>) => Promise<UserStats>;
}

export const useUserStatsStore = create<UserStatsState>()((set, get) => ({
  stats: null,
  loading: true,

  refreshStats: async () => {
    try {
      const repo = getRepository();
      const stats = await repo.getUserStats();
      set({ stats, loading: false });
      return stats;
    } catch (err) {
      console.warn('Failed to load user stats:', err);
      // Fallback default
      const fallback: UserStats = {
        id: 'local-stats',
        userId: 'local-user',
        xp: 120,
        streak: 5,
        maxStreak: 5,
        streakFreezesWeekly: 3,
        streakFreezesReserve: 1,
        targetMajorCode: '106',
        targetMajorName: 'Khoa học Máy tính',
        targetScore: 85.45,
        dailyGoalXp: 50,
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set({ stats: fallback, loading: false });
      return fallback;
    }
  },

  updateStats: async (updates) => {
    try {
      const repo = getRepository();
      const updated = await repo.updateUserStats(updates);
      set({ stats: updated });
      return updated;
    } catch (err) {
      console.warn('Failed to update user stats:', err);
      const current = get().stats;
      const merged = { ...current, ...updates } as UserStats;
      set({ stats: merged });
      return merged;
    }
  },
}));
