"use client";

import React from "react";
import { MapPin, Lock, CheckCircle2 } from "lucide-react";

interface JobRole {
  id: number;
  track_id: number;
  title: string;
  level_order: number;
  locked?: boolean;
}

interface MetroMapProps {
  roles: JobRole[];
  currentRoleId?: number;
  roleStates?: Record<number, "past" | "current" | "future" | "locked">;
  onRoleClick: (roleId: number) => void;
  selectedRoleId?: number;
  unlockedRoles?: Set<number>;
  recentlyUnlocked?: number | null;
}

export default function MetroMap({
  roles,
  currentRoleId,
  roleStates = {},
  onRoleClick,
  selectedRoleId,
  unlockedRoles = new Set(),
  recentlyUnlocked = null,
}: MetroMapProps) {
  // Rolleri level_order'a göre sırala
  const sortedRoles = [...roles].sort((a, b) => a.level_order - b.level_order);

  const getRoleState = (roleId: number): "past" | "current" | "future" | "locked" => {
    // Eğer kilit kırıldıysa, artık kilitli değil
    if (unlockedRoles.has(roleId)) {
      const state = roleStates[roleId];
      if (state === "locked") {
        return "future"; // Kilit kırıldı, artık gelecek olarak işaretle
      }
      return state || "future";
    }
    
    if (roleStates[roleId]) {
      return roleStates[roleId];
    }
    // Fallback logic
    const role = sortedRoles.find((r) => r.id === roleId);
    if (!role) return "locked";
    
    if (role.locked) return "locked";
    if (currentRoleId) {
      const currentRole = sortedRoles.find((r) => r.id === currentRoleId);
      if (currentRole) {
        if (role.level_order < currentRole.level_order) return "past";
        if (role.level_order === currentRole.level_order) return "current";
        if (role.level_order <= currentRole.level_order + 3) return "future";
      }
    }
    return "locked";
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "past":
        return "bg-green-500 border-green-600";
      case "current":
        return "bg-blue-600 border-blue-700";
      case "future":
        return "bg-slate-400 border-slate-500";
      case "locked":
        return "bg-slate-300 border-slate-400 opacity-50";
      default:
        return "bg-slate-400 border-slate-500";
    }
  };

  const getLineStyle = (index: number) => {
    if (index === 0) return null;
    
    const prevRole = sortedRoles[index - 1];
    const currentRole = sortedRoles[index];
    const prevState = getRoleState(prevRole.id);
    const currentState = getRoleState(currentRole.id);
    
    // Geçmişten mevcut veya geçmişe: dolu çizgi
    if (prevState === "past" || (prevState === "current" && currentState === "past")) {
      return "solid";
    }
    // Mevcut veya gelecekten geleceğe: kesik çizgi
    if (prevState === "current" || prevState === "future" || currentState === "future") {
      return "dashed";
    }
    return "dashed";
  };

  return (
    <div className="w-full bg-gradient-to-b from-slate-50 to-white rounded-lg border border-slate-200 shadow-sm p-6 overflow-x-auto">
      {/* Metro Hattı Container */}
      <div className="relative" style={{ minHeight: "250px" }}>
        {/* Metro Hattı Çizgisi - Yatay Timeline */}
        <div className="relative flex items-center justify-between px-4">
          {/* Ana Çizgi */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 transform -translate-y-1/2" />
          
          {/* İstasyonlar */}
          <div className="relative w-full flex justify-between items-center z-10">
            {sortedRoles.map((role, index) => {
              const state = getRoleState(role.id);
              const isCurrent = state === "current";
              const isSelected = role.id === selectedRoleId;
              const isClickable = state === "future" || state === "past";
              
              // Önceki istasyonla arasındaki çizgi
              const lineStyle = getLineStyle(index);
              const lineColor = state === "past" || (index > 0 && getRoleState(sortedRoles[index - 1].id) === "past") 
                ? "bg-green-500" 
                : "bg-slate-300";

              return (
                <React.Fragment key={role.id}>
                  {/* Bağlantı Çizgisi */}
                  {index > 0 && (
                    <div
                      className={`absolute h-1 ${lineColor} ${
                        lineStyle === "solid" ? "" : "border-dashed border-t-2 border-b-0"
                      }`}
                      style={{
                        left: `${((index - 1) / (sortedRoles.length - 1)) * 100}%`,
                        width: `${(1 / (sortedRoles.length - 1)) * 100}%`,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 1,
                      }}
                    />
                  )}
                  
                  {/* İstasyon Noktası */}
                  <div className="flex flex-col items-center relative" style={{ flex: 1 }}>
                    <button
                      onClick={() => isClickable && !role.locked && onRoleClick(role.id)}
                      disabled={!isClickable || role.locked}
                      className={`
                        relative z-20
                        w-20 h-20 rounded-full
                        flex items-center justify-center
                        transition-all duration-300
                        transform hover:scale-110
                        border-4
                        ${getStateColor(state)}
                        ${isCurrent ? "shadow-lg shadow-blue-500/50" : ""}
                        ${isClickable && !role.locked ? "cursor-pointer hover:scale-125" : "cursor-not-allowed"}
                        ${isSelected ? "ring-4 ring-blue-300" : ""}
                      `}
                      title={role.title}
                    >
                      {state === "locked" && !unlockedRoles.has(role.id) ? (
                        <Lock className="w-8 h-8 text-slate-600" />
                      ) : recentlyUnlocked === role.id ? (
                        // Kilit kırma animasyonu
                        <div className="relative">
                          <div className="absolute inset-0 animate-ping">
                            <Lock className="w-8 h-8 text-green-500 opacity-75" />
                          </div>
                          <MapPin className="w-8 h-8 text-white relative z-10 animate-bounce" />
                        </div>
                      ) : state === "past" ? (
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      ) : (
                        <MapPin className="w-8 h-8 text-white" />
                      )}
                      
                      {/* Kilit kırma bildirimi */}
                      {recentlyUnlocked === role.id && (
                        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 animate-bounce z-30">
                          <div className="bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
                            🎉 Tebrikler! Kilit Kırıldı!
                          </div>
                          <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-green-500" />
                        </div>
                      )}
                      
                      {/* Mevcut Konum - Pulse Animasyonu */}
                      {isCurrent && (
                        <>
                          <span className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-4 border-white animate-ping" />
                          <span className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-4 border-white" />
                        </>
                      )}
                    </button>

                    {/* "Buradasın" Etiketi */}
                    {isCurrent && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                        <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                          📍 Buradasın
                        </div>
                        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600" />
                      </div>
                    )}

                    {/* İstasyon Etiketi */}
                    <div
                      className={`
                        mt-3 px-3 py-2 rounded-lg text-xs font-medium text-center
                        max-w-[140px] whitespace-normal
                        ${
                          isCurrent
                            ? "bg-blue-100 text-blue-800 font-semibold border-2 border-blue-300"
                            : isSelected
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : state === "locked"
                            ? "bg-slate-100 text-slate-500 opacity-60"
                            : state === "past"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : "bg-white text-slate-700 border border-slate-200"
                        }
                      `}
                    >
                      {role.title}
                    </div>

                    {/* Seviye Göstergesi */}
                    <div className={`mt-1 text-xs ${
                      isCurrent ? "text-blue-600 font-semibold" : "text-slate-500"
                    }`}>
                      Seviye {role.level_order}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Açıklama Göstergesi */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600" />
            <span>Geçmiş (Tamamlandı)</span>
          </div>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600 border-4 border-blue-700 animate-pulse" />
            <span>Mevcut Konum</span>
          </div>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-400 border-2 border-slate-500" />
            <span>Gelecek (Tıklanabilir)</span>
          </div>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Kilitli Bölge</span>
          </div>
        </div>
      </div>
    </div>
  );
}
