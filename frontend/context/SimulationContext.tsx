"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SimulationContextType {
  currentDate: string;
  isPlaying: boolean;
  setCurrentDate: (date: string) => void;
  setIsPlaying: (playing: boolean) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const MIN_DATE = "2023-01-01";
const MAX_DATE = "2027-01-01";
const DEFAULT_DATE = "2025-01-01";

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState<string>(DEFAULT_DATE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("simulation_date");
      if (saved) {
        setCurrentDate(saved);
      }
    }
  }, []);

  // Save to localStorage when date changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("simulation_date", currentDate);
    }
  }, [currentDate]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentDate((prev) => {
        const date = new Date(prev);
        date.setMonth(date.getMonth() + 1); // Increment by 1 month
        
        const newDateStr = date.toISOString().split("T")[0];
        if (newDateStr >= MAX_DATE) {
          setIsPlaying(false);
          return prev;
        }
        return newDateStr;
      });
    }, 500); // Update every 500ms

    return () => clearInterval(interval);
  }, [isPlaying]);

  const play = () => {
    setIsPlaying(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentDate(DEFAULT_DATE);
  };

  return (
    <SimulationContext.Provider
      value={{
        currentDate,
        isPlaying,
        setCurrentDate,
        setIsPlaying,
        play,
        pause,
        reset,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}

