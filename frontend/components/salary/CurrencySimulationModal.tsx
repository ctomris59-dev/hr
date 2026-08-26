"use client";

import React from "react";
import { X, DollarSign, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { CurrencySimulationResult } from "../../app/utils/salarySimulation";

interface CurrencySimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CurrencySimulationResult | null;
}

export default function CurrencySimulationModal({
  isOpen,
  onClose,
  result,
}: CurrencySimulationModalProps) {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Dolar Artışı Simülasyonu Sonuçları
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Dolar %{result.dollarIncrease} artarsa maaş yükünüz nasıl etkilenir?
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
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-700">Dolar Artışı</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">%{result.dollarIncrease}</p>
              <p className="text-xs text-blue-600 mt-1">
                Tahmini Enflasyon: %{result.estimatedInflation}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-green-700">Mevcut Toplam Maaş</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {result.currentTotalSalary.toLocaleString("tr-TR")} ₺
              </p>
              <p className="text-xs text-green-600 mt-1">Aylık toplam</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-xs font-medium text-red-700">Yeni Toplam Maaş</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {result.newTotalSalary.toLocaleString("tr-TR")} ₺
              </p>
              <p className="text-xs text-red-600 mt-1">
                Artış: +{result.salaryIncrease.toLocaleString("tr-TR")} ₺ (%{result.salaryIncreasePercentage})
              </p>
            </div>
          </div>

          {/* Artış Detayları */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Artış Detayları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Aylık Artış</p>
                <p className="text-lg font-bold text-slate-800">
                  {result.monthlyIncrease.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Yıllık Artış</p>
                <p className="text-lg font-bold text-slate-800">
                  {result.yearlyIncrease.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Artış Yüzdesi</p>
                <p className="text-lg font-bold text-slate-800">
                  %{result.salaryIncreasePercentage}
                </p>
              </div>
            </div>
          </div>

          {/* Senaryo Karşılaştırması */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Senaryo Bazlı Maaş Yükü Karşılaştırması
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Senaryo A */}
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xs">A</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">Senaryo A</p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {result.scenarioResults.A.total.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Artış: +{result.scenarioResults.A.increase.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  (%{result.scenarioResults.A.percentage})
                </p>
              </div>

              {/* Senaryo B */}
              <div className="bg-white border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">B</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">Senaryo B</p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  {result.scenarioResults.B.total.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Artış: +{result.scenarioResults.B.increase.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-green-600 font-medium">
                  (%{result.scenarioResults.B.percentage})
                </p>
              </div>

              {/* Senaryo C */}
              <div className="bg-white border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-xs">C</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">Senaryo C</p>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {result.scenarioResults.C.total.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Artış: +{result.scenarioResults.C.increase.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-orange-600 font-medium">
                  (%{result.scenarioResults.C.percentage})
                </p>
              </div>

              {/* Senaryo D */}
              <div className="bg-white border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-xs">D</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">Senaryo D</p>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {result.scenarioResults.D.total.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Artış: +{result.scenarioResults.D.increase.toLocaleString("tr-TR")} ₺
                </p>
                <p className="text-xs text-purple-600 font-medium">
                  (%{result.scenarioResults.D.percentage})
                </p>
              </div>
            </div>
          </div>

          {/* Bilgi Notu */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-800">
              <strong>Not:</strong> Bu simülasyon, dolar artışının enflasyona etkisini tahmin eder.
              Gerçek enflasyon oranı, dolar artışına ek olarak diğer ekonomik faktörlere de bağlıdır.
              Senaryo C (Dengeli) varsayılan olarak gösterilmiştir.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

