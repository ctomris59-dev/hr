// Users data - Backend'deki users.json'dan dönüştürüldü
export interface User {
  password: string;
  name: string;
  role: string;
  dept: string;
  position: string;
  department?: string; // Alias for dept
  managerId?: string; // ID of the manager this user reports to
}

export const USERS: Record<string, User> = {
  ceo: {
    password: "123456",
    name: "Emin Öncü",
    role: "CEO",
    dept: "Yönetim",
    position: "Yönetim Kurulu Başkanı",
  },
  ik_dir: {
    password: "123",
    name: "Canan İns (Dir)",
    role: "IK",
    dept: "İnsan Kaynakları",
    position: "İnsan Kaynakları Direktörü",
  },
  canan8442: {
    password: "123",
    name: "Canan İns (Dir)",
    role: "DIRECTOR",
    dept: "İnsan Kaynakları",
    position: "İnsan Kaynakları Direktör",
  },
  mehmet4852: {
    password: "123",
    name: "Mehmet İns (Mdr-1)",
    role: "MANAGER",
    dept: "İnsan Kaynakları",
    position: "İnsan Kaynakları Müdür",
  },
  ayse9314: {
    password: "123",
    name: "Ayşe İns (867)",
    role: "PERSONEL",
    dept: "İnsan Kaynakları",
    position: "İnsan Kaynakları Kıdemli Uzman",
  },
};



