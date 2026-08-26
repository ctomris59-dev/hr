"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface Successor {
  id: number;
  successor_id: string;
  readiness_level: string;
  calculated_readiness?: string;
  readiness_percentage?: number;
  missing_skills?: string[];
  notes?: string;
}

interface TrafficLightCardProps {
  positionId: string;
  positionTitle: string;
  department: string;
  currentHolder: string;
  riskLevel: "CRITICAL" | "MODERATE" | "LOW";
  riskColor: "red" | "yellow" | "green";
  riskIcon: string;
  message: string;
  successors: Successor[];
  onDrop?: (employeeId: string) => void;
  isDraggingOver?: boolean;
}

export default function TrafficLightCard({
  positionId,
  positionTitle,
  department,
  currentHolder,
  riskLevel,
  riskColor,
  riskIcon,
  message,
  successors,
  onDrop,
  isDraggingOver,
}: TrafficLightCardProps) {
  const getReadinessDisplay = (successor: Successor) => {
    const level = successor.calculated_readiness || successor.readiness_level;
    const percentage = successor.readiness_percentage;
    const missingSkills = successor.missing_skills || [];
    
    switch (level) {
      case "READY_NOW":
        return {
          icon: CheckCircle2,
          color: "green",
          label: "Şimdi Hazır",
          message: percentage 
            ? `✅ Analiz Sonucu: Şimdi Hazır (Uyum: %${percentage.toFixed(0)})`
            : "✅ Analiz Sonucu: Şimdi Hazır",
        };
      case "READY_1_YEAR":
        return {
          icon: Clock,
          color: "yellow",
          label: "1 Yıl Sonra Hazır",
          message: missingSkills.length > 0
            ? `⏳ Analiz Sonucu: 1 Yıl (Eksik: ${missingSkills.slice(0, 2).join(", ")})`
            : percentage
            ? `⏳ Analiz Sonucu: 1 Yıl (Uyum: %${percentage.toFixed(0)})`
            : "⏳ Analiz Sonucu: 1 Yıl",
        };
      case "READY_2_YEARS":
        return {
          icon: AlertTriangle,
          color: "orange",
          label: "2+ Yıl Sonra Hazır",
          message: missingSkills.length > 0
            ? `⚠️ Analiz Sonucu: 2+ Yıl (Eksik: ${missingSkills.slice(0, 3).join(", ")})`
            : percentage
            ? `⚠️ Analiz Sonucu: 2+ Yıl (Uyum: %${percentage.toFixed(0)})}`
            : "⚠️ Analiz Sonucu: 2+ Yıl",
        };
      default:
        return {
          icon: Clock,
          color: "gray",
          label: level,
          message: successor.notes || "Hazırlık durumu belirleniyor",
        };
    }
  };

  const getRiskStyles = () => {
    switch (riskColor) {
      case "red":
        return {
          border: "border-red-500",
          bg: "bg-red-50",
          text: "text-red-800",
          light: "bg-red-500",
        };
      case "yellow":
        return {
          border: "border-yellow-500",
          bg: "bg-yellow-50",
          text: "text-yellow-800",
          light: "bg-yellow-500",
        };
      case "green":
        return {
          border: "border-green-500",
          bg: "bg-green-50",
          text: "text-green-800",
          light: "bg-green-500",
        };
      default:
        return {
          border: "border-slate-300",
          bg: "bg-slate-50",
          text: "text-slate-800",
          light: "bg-slate-400",
        };
    }
  };

  const styles = getRiskStyles();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const employeeId = e.dataTransfer.getData("text/plain");
    if (onDrop && employeeId) {
      onDrop(employeeId);
    }
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg shadow-sm p-4 transition-all ${
        styles.border
      } ${isDraggingOver ? "ring-4 ring-blue-300" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800">{positionTitle}</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {department} | Mevcut: {currentHolder}
          </p>
        </div>
        
        {/* Trafik Işığı */}
        <div className="relative">
          <div
            className={`w-12 h-12 rounded-full ${styles.light} ${
              riskLevel === "CRITICAL" ? "animate-pulse" : ""
            } shadow-lg flex items-center justify-center`}
          >
            <span className="text-2xl">{riskIcon}</span>
          </div>
        </div>
      </div>

      {/* Mesaj */}
      <div className={`${styles.bg} ${styles.text} p-2 rounded-lg mb-3`}>
        <p className="text-xs font-medium">{message}</p>
      </div>

      {/* Yedekler Listesi */}
      {successors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
            Yedekler:
          </p>
          <div className="space-y-3">
            {successors.map((successor, index) => {
              const display = getReadinessDisplay(successor);
              const Icon = display.icon;
              
              return (
                <div
                  key={index}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">👤</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {successor.successor_id}
                      </p>
                    </div>
                  </div>
                  
                  {/* Analiz Sonucu */}
                  <div className={`mt-2 p-2 rounded-lg ${
                    display.color === "green" ? "bg-green-50 border-green-200" :
                    display.color === "yellow" ? "bg-yellow-50 border-yellow-200" :
                    display.color === "orange" ? "bg-orange-50 border-orange-200" :
                    "bg-slate-50 border-slate-200"
                  } border`}>
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        display.color === "green" ? "text-green-600" :
                        display.color === "yellow" ? "text-yellow-600" :
                        display.color === "orange" ? "text-orange-600" :
                        "text-slate-600"
                      }`} />
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${
                          display.color === "green" ? "text-green-800" :
                          display.color === "yellow" ? "text-yellow-800" :
                          display.color === "orange" ? "text-orange-800" :
                          "text-slate-800"
                        }`}>
                          {display.message}
                        </p>
                        {successor.readiness_percentage && (
                          <div className="mt-1">
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  display.color === "green" ? "bg-green-500" :
                                  display.color === "yellow" ? "bg-yellow-500" :
                                  display.color === "orange" ? "bg-orange-500" :
                                  "bg-slate-500"
                                }`}
                                style={{ width: `${Math.min(100, successor.readiness_percentage)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
