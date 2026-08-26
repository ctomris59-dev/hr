"use client";

import { useSimulation } from "../context/SimulationContext";
import { Play, Pause, RotateCcw, Calendar } from "lucide-react";
import { useState, useEffect } from "react";

const MIN_DATE = "2023-01-01";
const MAX_DATE = "2027-01-01";

const MONTHS_TR = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
];

export default function TimeMachine() {
  const { currentDate, isPlaying, setCurrentDate, play, pause, reset } = useSimulation();
  const [sliderValue, setSliderValue] = useState(0);

  // Calculate slider value from date
  useEffect(() => {
    const min = new Date(MIN_DATE).getTime();
    const max = new Date(MAX_DATE).getTime();
    const current = new Date(currentDate).getTime();
    const value = ((current - min) / (max - min)) * 100;
    setSliderValue(value);
  }, [currentDate]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = MONTHS_TR[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  // Handle slider change
  const handleSliderChange = (value: number) => {
    const min = new Date(MIN_DATE).getTime();
    const max = new Date(MAX_DATE).getTime();
    const newTime = min + (value / 100) * (max - min);
    const newDate = new Date(newTime);
    const newDateStr = newDate.toISOString().split("T")[0];
    setCurrentDate(newDateStr);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t border-slate-700 shadow-2xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Date Display */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-white">
              {formatDate(currentDate)}
            </span>
          </div>

          {/* Slider */}
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${sliderValue}%, #475569 ${sliderValue}%, #475569 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>2023</span>
              <span>2027</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button
                onClick={pause}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Pause className="w-4 h-4" />
                <span className="text-sm font-medium">Duraklat</span>
              </button>
            ) : (
              <button
                onClick={play}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm font-medium">Oynat</span>
              </button>
            )}
            <button
              onClick={reset}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              title="Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

