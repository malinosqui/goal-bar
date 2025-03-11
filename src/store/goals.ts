import { create } from 'zustand';
import { fs, path } from '@tauri-apps/api';

export interface Goal {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  impediments?: string;
  priority: 'low' | 'medium' | 'high';
}

interface GoalsStore {
  goals: Goal[];
  addGoal: (title: string, priority: Goal['priority']) => Promise<void>;
  toggleGoal: (id: string) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  clearGoals: () => Promise<void>;
  loadGoals: () => Promise<void>;
  setImpediment: (id: string, impediment: string | null) => Promise<void>;
  setPriority: (id: string, priority: Goal['priority']) => Promise<void>;
}

async function getGoalsPath() {
  try {
    const appDir = await path.appDataDir();
    await fs.createDir(appDir, { recursive: true });
    const goalsPath = await path.join(appDir, 'goals.json');
    console.log('Goals file path:', goalsPath);
    return goalsPath;
  } catch (error) {
    console.error('Error getting goals path:', error);
    throw new Error('Não foi possível acessar o diretório do aplicativo');
  }
}

async function saveGoals(goals: Goal[]) {
  try {
    const filePath = await getGoalsPath();
    console.log('Saving goals:', goals);
    const content = JSON.stringify(goals, null, 2);
    await fs.writeTextFile(filePath, content);
    console.log('Goals saved successfully');
  } catch (error) {
    console.error('Error saving goals:', error);
    throw new Error('Não foi possível salvar as metas');
  }
}

async function loadGoalsFromFile(): Promise<Goal[]> {
  try {
    const filePath = await getGoalsPath();
    const exists = await fs.exists(filePath);
    
    if (!exists) {
      console.log('Goals file does not exist, creating empty file');
      await saveGoals([]);
      return [];
    }

    const content = await fs.readTextFile(filePath);
    const goals = JSON.parse(content);
    
    // Migração: adiciona prioridade padrão para metas antigas
    const migratedGoals = goals.map((goal: any) => ({
      ...goal,
      priority: goal.priority || 'medium', // Define 'medium' como prioridade padrão
    }));

    // Se houve alguma migração, salva as metas atualizadas
    if (goals.some((goal: any) => !goal.priority)) {
      console.log('Migrating goals to add priority field');
      await saveGoals(migratedGoals);
    }

    return migratedGoals;
  } catch (error) {
    console.error('Error loading goals:', error);
    throw new Error('Não foi possível carregar as metas');
  }
}

export const useGoalsStore = create<GoalsStore>()((set, get) => ({
  goals: [],
  loadGoals: async () => {
    try {
      const goals = await loadGoalsFromFile();
      set({ goals });
      console.log('Goals loaded successfully');
    } catch (error) {
      console.error('Error in loadGoals:', error);
      throw error;
    }
  },
  addGoal: async (title, priority = 'medium') => {
    try {
      console.log('Adding goal:', { title, priority });
      const newGoal: Goal = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
        priority,
      };
      const currentGoals = get().goals;
      const newGoals = [...currentGoals, newGoal];
      await saveGoals(newGoals);
      set({ goals: newGoals });
      console.log('Goal added successfully');
    } catch (error) {
      console.error('Error in addGoal:', error);
      throw error;
    }
  },
  toggleGoal: async (id) => {
    try {
      console.log('Toggling goal:', id);
      const currentGoals = get().goals;
      const newGoals = currentGoals.map((goal) =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      );
      await saveGoals(newGoals);
      set({ goals: newGoals });
      console.log('Goal toggled successfully');
    } catch (error) {
      console.error('Error in toggleGoal:', error);
      throw error;
    }
  },
  removeGoal: async (id) => {
    try {
      console.log('Removing goal:', id);
      const currentGoals = get().goals;
      const newGoals = currentGoals.filter((goal) => goal.id !== id);
      await saveGoals(newGoals);
      set({ goals: newGoals });
      console.log('Goal removed successfully');
    } catch (error) {
      console.error('Error in removeGoal:', error);
      throw error;
    }
  },
  clearGoals: async () => {
    try {
      console.log('Clearing all goals');
      await saveGoals([]);
      set({ goals: [] });
      console.log('Goals cleared successfully');
    } catch (error) {
      console.error('Error in clearGoals:', error);
      throw error;
    }
  },
  setImpediment: async (id, impediment) => {
    try {
      console.log('Setting impediment for goal:', id, impediment);
      const currentGoals = get().goals;
      console.log('Current goals before update:', currentGoals);
      
      // Cria uma nova lista de metas com o impedimento atualizado
      const newGoals = currentGoals.map((goal) => {
        if (goal.id === id) {
          console.log('Updating goal:', goal.title, 'with impediment:', impediment);
          return { ...goal, impediments: impediment || undefined };
        }
        return goal;
      });
      
      console.log('New goals after update:', newGoals);
      await saveGoals(newGoals);
      set({ goals: newGoals });
      console.log('Goals state after set:', get().goals);
    } catch (error) {
      console.error('Error in setImpediment:', error);
      throw error;
    }
  },
  setPriority: async (id, priority) => {
    try {
      console.log('Setting priority for goal:', id, priority);
      const currentGoals = get().goals;
      const newGoals = currentGoals.map((goal) =>
        goal.id === id ? { ...goal, priority } : goal
      );
      await saveGoals(newGoals);
      set({ goals: newGoals });
      console.log('Priority updated successfully');
    } catch (error) {
      console.error('Error in setPriority:', error);
      throw error;
    }
  },
})); 