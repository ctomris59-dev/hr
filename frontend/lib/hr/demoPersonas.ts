import type { UserRole } from "@/app/data/roles";

export interface DemoPersona {
  username: string;
  name: string;
  role: "CEO" | "IK" | "DIRECTOR" | "MANAGER" | "PERSONEL";
  dept: string;
  department: string;
  position: string;
  authMode: "demo";
  demoPersona: true;
}

export const DEMO_PERSONAS: Record<UserRole, DemoPersona> = {
  ceo: {
    username: "ceo",
    name: "Emin Öncü",
    role: "CEO",
    dept: "Genel Yönetim",
    department: "Genel Yönetim",
    position: "Genel Müdür",
    authMode: "demo",
    demoPersona: true,
  },
  hr_admin: {
    username: "ik_dir",
    name: "Selin Acar",
    role: "IK",
    dept: "İnsan Kaynakları",
    department: "İnsan Kaynakları",
    position: "İnsan Kaynakları Müdürü",
    authMode: "demo",
    demoPersona: true,
  },
  director: {
    username: "demo_director",
    name: "Deniz Şahin",
    role: "DIRECTOR",
    dept: "BT & Dijital",
    department: "BT & Dijital",
    position: "Bilgi Teknolojileri Müdürü",
    authMode: "demo",
    demoPersona: true,
  },
  manager: {
    username: "demo_manager",
    name: "Hakan Çetin",
    role: "MANAGER",
    dept: "Operasyon & Üretim",
    department: "Operasyon & Üretim",
    position: "Üretim Müdürü",
    authMode: "demo",
    demoPersona: true,
  },
  employee: {
    username: "demo_employee",
    name: "Pelin Yılmaz",
    role: "PERSONEL",
    dept: "Operasyon & Üretim",
    department: "Operasyon & Üretim",
    position: "Üretim Mühendisi",
    authMode: "demo",
    demoPersona: true,
  },
};

export const PRIMARY_DEMO_ROLES: UserRole[] = ["ceo", "hr_admin", "manager", "employee"];

export function getDemoPersona(role: UserRole): DemoPersona {
  return { ...DEMO_PERSONAS[role] };
}
