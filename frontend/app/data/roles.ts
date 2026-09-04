// FutureHR Role-Based Access Control (RBAC)
// Pozisyon ile sistem rolü birbirinden ayrıdır. Sistem rolü erişim seviyesini,
// organizasyondaki Yönetici 1 / Yönetici 2 ilişkileri ise veri kapsamını belirler.

export type UserRole = "ceo" | "hr_admin" | "director" | "manager" | "employee";
export const ROLE_MAPPING: Record<string, UserRole> = { CEO:"ceo", IK:"hr_admin", HR:"hr_admin", HR_ADMIN:"hr_admin", DIRECTOR:"director", MANAGER:"manager", PERSONEL:"employee", EMPLOYEE:"employee" };
export const REVERSE_ROLE_MAPPING: Record<UserRole,string[]> = { ceo:["CEO"], hr_admin:["IK"], director:["DIRECTOR"], manager:["MANAGER"], employee:["PERSONEL","EMPLOYEE"] };

const EXECUTIVE_ROUTES=["/dashboard","/kullanici","/karar-merkezi","/calisan-deneyimi","/organizasyon","/rol-mimarisi","/degerlendirme","/kalibrasyon","/yetenek-matrisi","/yetkinlik-haritasi","/egitim","/gelisim","/gelisim-analitigi","/kariyer","/yedekleme","/maas","/ucret-adaleti","/ise-alim","/aday-testi","/ekip-yonetimi","/kurulum","/admin","/admin/entegrasyonlar","/admin/veri-aktarimi","/admin/guven-kvkk","/turkiye-uyum","/yonetici-raporlari","/izinler","/ayarlar/roller","/ayarlar/yetki-mimarisi","/yonetici/maas-talep"];
export const ROLE_ACCESS_CONFIG: Record<UserRole,string[]> = {
  ceo:[...EXECUTIVE_ROUTES],
  hr_admin:[...EXECUTIVE_ROUTES.filter(route=>route!=="/ayarlar/roller")],
  director:["/dashboard","/kullanici","/karar-merkezi","/calisan-deneyimi","/rol-mimarisi","/degerlendirme","/kalibrasyon","/yetkinlik-haritasi","/egitim","/gelisim","/gelisim-analitigi","/kariyer","/izinler","/ekip-yonetimi","/yonetici/maas-talep","/yonetici-raporlari"],
  manager:["/dashboard","/kullanici","/karar-merkezi","/calisan-deneyimi","/rol-mimarisi","/degerlendirme","/kalibrasyon","/yetkinlik-haritasi","/egitim","/gelisim","/gelisim-analitigi","/kariyer","/izinler","/ekip-yonetimi","/yonetici/maas-talep"],
  employee:["/kullanici","/kariyer","/gelisim","/egitim","/izinler","/calisan-deneyimi"],
};

export const ROLE_PERMISSIONS: Record<UserRole,{canCreateRoles:string[];canAccessDepartments:"all"|"own";canAccessSalary:boolean;canAccessOrgChart:boolean}> = {
  ceo:{canCreateRoles:["IK","DIRECTOR","MANAGER","PERSONEL"],canAccessDepartments:"all",canAccessSalary:true,canAccessOrgChart:true},
  hr_admin:{canCreateRoles:["DIRECTOR","MANAGER","PERSONEL"],canAccessDepartments:"all",canAccessSalary:true,canAccessOrgChart:true},
  director:{canCreateRoles:[],canAccessDepartments:"own",canAccessSalary:false,canAccessOrgChart:false},
  manager:{canCreateRoles:[],canAccessDepartments:"own",canAccessSalary:false,canAccessOrgChart:false},
  employee:{canCreateRoles:[],canAccessDepartments:"own",canAccessSalary:false,canAccessOrgChart:false},
};
export function isExecutiveRole(role:UserRole|null|undefined){return role==="ceo"||role==="hr_admin";}
export function getDefaultRoute(role:UserRole|null|undefined){if(!role)return"/dashboard";return ROLE_ACCESS_CONFIG[role]?.[0]||"/dashboard";}
export function hasAccess(role:UserRole|null|undefined,pathname:string){if(!role)return false;const allowed=ROLE_ACCESS_CONFIG[role];if(!allowed)return false;let normalized=pathname;try{if(pathname.includes("%"))normalized=decodeURIComponent(pathname);}catch{}return allowed.some(route=>normalized===route||normalized.startsWith(route+"/")||pathname===route||pathname.startsWith(route+"/"));}
export function mapToUserRole(internalRole:string):UserRole{return ROLE_MAPPING[String(internalRole||"").toUpperCase()]||"employee";}
