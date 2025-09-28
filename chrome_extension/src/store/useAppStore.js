import { create } from "zustand";

export const useAppStore = create((set) => ({
    // User state
    user: null,
    setUser: (user) => set({ user }),

    // Purchase simulation state
    pendingPurchaseAmount: 0,
    setPendingPurchaseAmount: (amount) =>
        set({ pendingPurchaseAmount: amount }),

    // Theme state removed (always-dark)

    // Applied recommendations tracking
    appliedRecommendations: [],
    applyRecommendation: (recommendation) =>
        set((state) => ({
            appliedRecommendations: [
                ...state.appliedRecommendations,
                recommendation.id,
            ],
        })),
    removeRecommendation: (recommendationId) =>
        set((state) => ({
            appliedRecommendations: state.appliedRecommendations.filter(
                (id) => id !== recommendationId
            ),
        })),

    // Loading states
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),
}));
