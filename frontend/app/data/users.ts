export interface User {
  password: string;
  name: string;
  role: string;
  dept: string;
  position: string;
  department?: string;
  managerId?: string;
}

// Yalnızca demo prototipinde kullanılan hesaplar. Gerçek SaaS oturumu
// /api/secure-auth üzerinden yönetilir; bu kayıtlar production kimlik sistemi değildir.
export const USERS: Record<string, User> = {
  ceo: {
    password: "123",
    name: "Emin Öncü",
    role: "CEO",
    dept: "Genel Yönetim",
    department: "Genel Yönetim",
    position: "Genel Müdür",
  },
  ik_dir: {
    password: "123",
    name: "Selin Acar",
    role: "IK",
    dept: "İnsan Kaynakları",
    department: "İnsan Kaynakları",
    position: "İnsan Kaynakları Müdürü",
  },
  demo_director: {
    password: "123",
    name: "Deniz Şahin",
    role: "DIRECTOR",
    dept: "BT & Dijital",
    department: "BT & Dijital",
    position: "Bilgi Teknolojileri Müdürü",
  },
  demo_manager: {
    password: "123",
    name: "Hakan Çetin",
    role: "MANAGER",
    dept: "Operasyon & Üretim",
    department: "Operasyon & Üretim",
    position: "Üretim Müdürü",
  },
  demo_employee: {
    password: "123",
    name: "Pelin Yılmaz",
    role: "PERSONEL",
    dept: "Operasyon & Üretim",
    department: "Operasyon & Üretim",
    position: "Üretim Mühendisi",
  },
};
