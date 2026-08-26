"use client";

import React, { useState } from "react";
import { X, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface ReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  positionTitle: string;
  employeeName: string;
  onConfirm: (readinessLevel: string, notes: string) => void;
}

export default function ReadinessModal({
  isOpen,
  onClose,
  positionTitle,
  employeeName,
  onConfirm,
}: ReadinessModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("READY_NOW");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedLevel, notes);
    setSelectedLevel("READY_NOW");
    setNotes("");
    onClose();
  };

  const readinessOptions = [
    {
      value: "READY_NOW",
      label: "Şimdi Hazır",
      icon: CheckCircle2,
      color: "green",
      description: "Yedek şu anda bu pozisyonu üstlenebilir",
    },
    {
      value: "READY_1_YEAR",
      label: "1 Yıl Sonra Hazır",
      icon: Clock,
      color: "yellow",
      description: "Yedek 1 yıl içinde hazır olacak",
    },
    {
      value: "READY_2_YEARS",
      label: "2+ Yıl Sonra Hazır",
      icon: AlertCircle,
      color: "orange",
      description: "Yedek 2 yıl veya daha uzun sürede hazır olacak",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Hazırlık Süresi Seç
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {employeeName} → {positionTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Hazırlık Seviyesi
            </label>
            <div className="space-y-2">
              {readinessOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`
                      flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer
                      transition-all
                      ${
                        selectedLevel === option.value
                          ? `border-${option.color}-500 bg-${option.color}-50`
                          : "border-slate-200 hover:border-slate-300"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="readiness"
                      value={option.value}
                      checked={selectedLevel === option.value}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={`w-4 h-4 text-${option.color}-600`}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek notlar, gelişim planı vb..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}

