import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'completedDocs';

interface ProgressContextType {
  completed: string[];
  toggleComplete: (docId: string) => void;
  isCompleted: (docId: string) => boolean;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setCompleted(stored);
  }, []);

  const toggleComplete = (docId: string) => {
    const updated = completed.includes(docId)
      ? completed.filter((id) => id !== docId)
      : [...completed, docId];
    setCompleted(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const isCompleted = (docId: string) => completed.includes(docId);

  return (
    <ProgressContext.Provider value={{ completed, toggleComplete, isCompleted }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (undefined === context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};