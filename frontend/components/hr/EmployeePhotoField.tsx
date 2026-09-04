"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import EmployeeAvatar from "@/components/hr/EmployeeAvatar";
import { prepareEmployeeAvatar } from "@/lib/hr/avatarImage";

export default function EmployeePhotoField({
  name,
  src,
  disabled = false,
  onChange,
}: {
  name: string;
  src?: string | null;
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const chooseFile = async (file: File) => {
    setProcessing(true);
    setError("");
    try {
      onChange(await prepareEmployeeAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fotoğraf işlenemedi.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void chooseFile(file);
        }}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <EmployeeAvatar name={name || "FutureHR"} src={src} size="lg" showStatus />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Personel fotoğrafı</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            JPG, PNG veya WebP · en fazla 2 MB. Fotoğraf otomatik olarak kare kırpılır ve profil alanlarına uyarlanır.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled || processing}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {processing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {processing ? "İşleniyor" : src ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
            </button>
            {src && (
              <button
                type="button"
                disabled={disabled || processing}
                onClick={() => onChange(null)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Kaldır
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
