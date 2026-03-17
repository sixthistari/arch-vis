import { create } from 'zustand';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../model/types';
import * as api from '../api/client';
import { useModelStore } from './model';
import { useViewStore } from './view';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  loading: boolean;
  loadProjects: () => Promise<void>;
  switchProject: (id: string) => Promise<void>;
  createProject: (data: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const [projects, current] = await Promise.all([
        api.fetchProjects(),
        api.fetchCurrentProject(),
      ]);
      set({ projects, currentProjectId: current.id, loading: false });
    } catch (err) {
      console.error('Failed to load projects:', err);
      set({ loading: false });
    }
  },

  switchProject: async (id: string) => {
    const result = await api.switchProject(id);
    set({ currentProjectId: result.id });
    // Reload all model and view data for the new project
    await Promise.all([
      useModelStore.getState().loadAll(),
      useViewStore.getState().loadViewList(),
    ]);
    // Clear current view since it belongs to the old project
    useViewStore.setState({
      currentView: null,
      viewElements: [],
      viewRelationships: [],
    });
  },

  createProject: async (data: CreateProjectInput) => {
    const project = await api.createProject(data);
    set(state => ({ projects: [...state.projects, project] }));
    return project;
  },

  updateProject: async (id: string, data: UpdateProjectInput) => {
    const updated = await api.updateProject(id, data);
    set(state => ({
      projects: state.projects.map(p => p.id === id ? updated : p),
    }));
    return updated;
  },

  deleteProject: async (id: string) => {
    await api.deleteProject(id);
    const { projects, currentProjectId } = get();
    const remaining = projects.filter(p => p.id !== id);
    set({ projects: remaining });

    // If we deleted the current project, switch to the first remaining
    if (currentProjectId === id && remaining.length > 0) {
      await get().switchProject(remaining[0]!.id);
    }
  },
}));
