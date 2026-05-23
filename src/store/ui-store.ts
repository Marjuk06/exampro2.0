import { create } from "zustand";

interface UiStore {
  sidebarOpen: boolean;
  adminTab: string;
  selectedExamFilter: string;
  toggleSidebar: () => void;
  setAdminTab: (tab: string) => void;
  setSelectedExamFilter: (id: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  adminTab: "dashboard",
  selectedExamFilter: "",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setAdminTab: (adminTab) => set({ adminTab }),
  setSelectedExamFilter: (selectedExamFilter) => set({ selectedExamFilter }),
}));
