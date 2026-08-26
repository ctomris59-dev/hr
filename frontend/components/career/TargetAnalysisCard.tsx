"use client";

import React from "react";
import { X, TrendingUp, AlertCircle, CheckCircle2, BookOpen, ArrowRight, Award } from "lucide-react";
import Link from "next/link";

interface Gap {
  skill_code: string;
  skill_name: string;
  current_score: number;
  required_score: number;
  gap: number;
}

interface TargetAnalysisCardProps {
  targetRoleTitle: string;
  readinessPercentage: number;
  gaps: Gap[];
  missingBadges: string[];
  overallStatus: "ready" | "preparing" | "not_ready";
  onClose: () => void;
}

export default function TargetAnalysisCard({
  targetRoleTitle,
  readinessPercentage,
  gaps,
  missingBadges,
  overallStatus,
  onClose,
}: TargetAnalysisCardProps) {
  const getStatusColor = () => {
    switch (overallStatus) {
      case "ready":
        return "bg-green-50 border-green-200 text-green-800";
      case "preparing":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "not_ready":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800";
    }
  };

  const getStatusIcon = () => {
    switch (overallStatus) {
      case "ready":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "preparing":
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case "not_ready":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (overallStatus) {
      case "ready":
        return "Hazır!";
      case "preparing":
        return "Hazırlanıyor...";
      case "not_ready":
        return "Hazır Değil";
      default:
        return "";
    }
  };

  // Yetkinlikleri hazır/eksik olarak ayır
  const readySkills = gaps.filter((g) => g.current_score >= g.required_score);
  const missingSkills = gaps.filter((g) => g.current_score < g.required_score);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Hedef Analiz: {targetRoleTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Mevcut yetkinlikleriniz ile hedef rol gereksinimleri karşılaştırması
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
        <div className="p-6 space-y-6">
          {/* Hedefe Uzaklık Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Hedefe Uzaklık
              </span>
              <span className="text-sm font-semibold text-slate-800">
                %{readinessPercentage.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  overallStatus === "ready"
                    ? "bg-green-500"
                    : overallStatus === "preparing"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${readinessPercentage}%` }}
              />
            </div>
            <div className={`mt-3 p-3 rounded-lg border ${getStatusColor()}`}>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-semibold">{getStatusText()}</span>
              </div>
            </div>
          </div>

          {/* Hazır Yetkinlikler */}
          {readySkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Güçlü Yönler (Hazır)
              </h3>
              <div className="space-y-2">
                {readySkills.map((gap, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          ✅ {gap.skill_name}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-green-700">
                            Sen: <strong>{gap.current_score.toFixed(1)}</strong>
                          </span>
                          <span className="text-xs text-green-600">/</span>
                          <span className="text-xs text-green-700">
                            Hedef: <strong>{gap.required_score.toFixed(1)}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="w-32 bg-green-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (gap.current_score / gap.required_score) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eksik Yetkinlikler */}
          {missingSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Geliştirilmesi Gereken Alanlar
              </h3>
              <div className="space-y-3">
                {missingSkills.map((gap, index) => {
                  const progressPercent = Math.min(
                    100,
                    (gap.current_score / gap.required_score) * 100
                  );
                  const gapAmount = gap.required_score - gap.current_score;

                  return (
                    <div
                      key={index}
                      className="p-4 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800">
                            ❌ {gap.skill_name}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            <span className="text-red-700">
                              Sen: <strong className="text-base">{gap.current_score.toFixed(1)}</strong>
                            </span>
                            <span className="text-red-500">/</span>
                            <span className="text-red-700">
                              Hedef: <strong className="text-base">{gap.required_score.toFixed(1)}</strong>
                            </span>
                            <span className="text-red-600 font-semibold">
                              (Eksik: +{gapAmount.toFixed(1)})
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-red-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-red-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          {progressPercent.toFixed(0)}% tamamlandı - {gapAmount.toFixed(1)} puan daha gerekli
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Eksik Rozetler */}
          {missingBadges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4" />
                Eksik Rozetler / Sertifikalar
              </h3>
              <div className="space-y-2">
                {missingBadges.map((badge, index) => (
                  <div
                    key={index}
                    className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-800">
                        ❌ <strong>{badge}</strong>
                      </p>
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      Bu pozisyon için {badge} sertifikası gereklidir.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Başarı Mesajı */}
          {gaps.length === 0 && missingBadges.length === 0 && (
            <div className="p-6 bg-green-50 border-2 border-green-300 rounded-lg text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-800">
                🎉 Tebrikler!
              </p>
              <p className="text-sm text-green-700 mt-2">
                Bu pozisyon için tüm gereksinimleri karşılıyorsunuz.
              </p>
            </div>
          )}

          {/* Aksiyon Butonu */}
          {(missingSkills.length > 0 || missingBadges.length > 0) && (
            <div className="pt-4 border-t border-slate-200">
              <Link
                href="/egitim"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-lg hover:shadow-xl"
              >
                <BookOpen className="w-4 h-4" />
                <span>Bu Eksikleri Kapatmak İçin Eğitim Öner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
