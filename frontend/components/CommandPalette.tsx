"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, DollarSign, Plane, UserPlus, Moon, Sun, Search } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";
import { useTheme } from "next-themes";

const pageLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Organizasyon", href: "/organizasyon", icon: Users },
  { label: "Maaş Simülasyonu", href: "/maas", icon: DollarSign },
  { label: "İzin Yönetimi", href: "/izinler", icon: Plane },
  { label: "Ekip & Kullanıcı Yönetimi", href: "/ekip-yonetimi", icon: Users },
  { label: "İşe Alım", href: "/ise-alim", icon: UserPlus },
];

export default function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<string[]>([]);

  useEffect(() => {
    const stored = getStorageData<any[]>(STORAGE_KEYS.ORG_CHART, []);
    const names = Array.from(
      new Set(
        stored
          .map((p) => p["Ad Soyad"])
          .filter((name: string) => Boolean(name))
      )
    ).sort();
    setPeople(names);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const filteredPeople = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return people.filter((name) => name.toLowerCase().includes(term)).slice(0, 8);
  }, [people, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="absolute left-1/2 top-[12vh] w-full max-w-2xl -translate-x-1/2 px-4">
        <div className="rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl dark:bg-slate-900/80 dark:border-slate-700">
          <Command shouldFilter={false} className="w-full">
            <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-700">
              <Search className="h-4 w-4" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Sayfa, aksiyon veya personel ara..."
                className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 dark:text-slate-100"
              />
              <kbd className="rounded border border-slate-200 bg-white/60 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-3">
              <Command.Empty className="py-6 text-center text-sm text-slate-500">
                Sonuç bulunamadı.
              </Command.Empty>

              <Command.Group heading="Sayfalar" className="text-xs text-slate-500">
                {pageLinks.map((page) => {
                  const Icon = page.icon;
                  return (
                    <Command.Item
                      key={page.href}
                      onSelect={() => {
                        setOpen(false);
                        router.push(page.href);
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                    >
                      <Icon className="h-4 w-4 text-slate-500" />
                      {page.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>

              <Command.Group heading="Hızlı Aksiyonlar" className="mt-3 text-xs text-slate-500">
                <Command.Item
                  onSelect={() => {
                    sessionStorage.setItem("openAddEmployeeModal", "true");
                    setOpen(false);
                    router.push("/ekip-yonetimi");
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <UserPlus className="h-4 w-4 text-slate-500" />
                  Yeni Personel Ekle
                </Command.Item>
                <Command.Item
                  onSelect={() => {
                    setOpen(false);
                    router.push("/izinler");
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <Plane className="h-4 w-4 text-slate-500" />
                  İzin Talep Et
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Tema" className="mt-3 text-xs text-slate-500">
                <Command.Item
                  onSelect={() => {
                    setTheme("light");
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <Sun className="h-4 w-4 text-amber-500" />
                  Açık Mod
                </Command.Item>
                <Command.Item
                  onSelect={() => {
                    setTheme("dark");
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <Moon className="h-4 w-4 text-slate-600" />
                  Koyu Mod
                </Command.Item>
                <Command.Item
                  onSelect={() => {
                    setTheme("system");
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                >
                  <span className="h-4 w-4 rounded-full bg-slate-300 dark:bg-slate-600" />
                  Sistem
                </Command.Item>
              </Command.Group>

              {filteredPeople.length > 0 && (
                <Command.Group heading="Personel" className="mt-3 text-xs text-slate-500">
                  {filteredPeople.map((name) => (
                    <Command.Item
                      key={name}
                      onSelect={() => {
                        sessionStorage.setItem("orgSearch", name);
                        setOpen(false);
                        router.push("/organizasyon");
                      }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 data-[selected=true]:bg-slate-100 dark:text-slate-100 dark:data-[selected=true]:bg-slate-800"
                    >
                      {name}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </div>
      </div>
    </div>
  );
}
