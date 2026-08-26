"use client";

import React, { useState } from "react";
import { Users, Loader2 } from "lucide-react";

interface HighPotentialEmployee {
  id: string;
  name: string;
  position: string;
  department: string;
  potansiyel: number;
  performans: number;
}

interface HighPotentialSidebarProps {
  employees: HighPotentialEmployee[];
  loading?: boolean;
}

export default function HighPotentialSidebar({
  employees,
  loading,
}: HighPotentialSidebarProps) {
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, employeeId: string) => {
    e.dataTransfer.setData("text/plain", employeeId);
    setDraggedEmployee(employeeId);
  };

  const handleDragEnd = () => {
    setDraggedEmployee(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-800">
          Yüksek Potansiyelli Çalışanlar
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : employees.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">
          Yüksek potansiyelli çalışan bulunamadı.
        </p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {employees.map((employee) => (
            <div
              key={employee.id}
              draggable
              onDragStart={(e) => handleDragStart(e, employee.id)}
              onDragEnd={handleDragEnd}
              className={`
                p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-move
                transition-all hover:bg-blue-50 hover:border-blue-300
                ${draggedEmployee === employee.id ? "opacity-50" : ""}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-800">
                    {employee.name}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {employee.position}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {employee.department}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-blue-600">
                    Pot: <strong>{employee.potansiyel.toFixed(1)}</strong>
                  </p>
                  <p className="text-xs font-mono text-green-600">
                    Perf: <strong>{employee.performans.toFixed(1)}</strong>
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                👆 Sürükle ve bırak
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

