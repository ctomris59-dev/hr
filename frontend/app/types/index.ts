// Centralized Type Definitions for the HR System

// Organization Chart Entry
export interface OrgChartEntry {
  "Ad Soyad": string;
  Pozisyon: string;
  Departman: string;
  "Maaş (TL)"?: number;
  "Kıdem (Yıl)"?: number;
  "İzin Hakkı (Gün)"?: number;
  "Yönetici 1"?: string;
  "Yönetici 2"?: string;
  Performans?: number;
  Potansiyel?: number;
  Calisma_Yili?: number;
  Izin_Hakki?: number;
  manager_proposal?: number; // Yöneticinin önerdiği zam oranı (%)
  manager_note?: string; // Yöneticinin gerekçesi
  [key: string]: string | number | undefined;
}

// History 360 Entry
export interface History360Entry {
  Personel: string;
  Departman: string;
  Pozisyon: string;
  Performans: number;
  Potansiyel: number;
  date: string;
  DIG_Mgr?: number;
  DIG_Mgr2?: number;
  DIG_Peer?: number;
  DIG_Self?: number;
  ANA_Mgr?: number;
  ANA_Mgr2?: number;
  ANA_Peer?: number;
  ANA_Self?: number;
  RES_Mgr?: number;
  RES_Mgr2?: number;
  RES_Peer?: number;
  RES_Self?: number;
  DET_Mgr?: number;
  DET_Mgr2?: number;
  DET_Peer?: number;
  DET_Self?: number;
  LRN_Mgr?: number;
  LRN_Mgr2?: number;
  LRN_Peer?: number;
  LRN_Self?: number;
  ETH_Mgr?: number;
  ETH_Mgr2?: number;
  ETH_Peer?: number;
  ETH_Self?: number;
  DIS_Mgr?: number;
  DIS_Mgr2?: number;
  DIS_Peer?: number;
  DIS_Self?: number;
  STR_Mgr?: number;
  STR_Mgr2?: number;
  STR_Peer?: number;
  STR_Self?: number;
  TEA_Mgr?: number;
  TEA_Mgr2?: number;
  TEA_Peer?: number;
  TEA_Self?: number;
  COM_Mgr?: number;
  COM_Mgr2?: number;
  COM_Peer?: number;
  COM_Self?: number;
  Performans_Mgr1?: number;
  Performans_Mgr2?: number;
  target?: string;
  [key: string]: string | number | undefined;
}

// User Interface
export interface User {
  username: string;
  password: string;
  name: string;
  role: string;
  dept?: string;
  position?: string;
}

// Current User (from storage)
export interface CurrentUser {
  username: string;
  name: string;
  role: string;
  dept?: string;
  position?: string;
  [key: string]: string | undefined;
}

// Merged Data (Org + 360)
export interface MergedEmployeeData extends OrgChartEntry {
  [key: string]: string | number | undefined;
}

// Department Statistics
export interface DepartmentStats {
  name: string;
  value: number;
  count: number;
}

// Chart Data Types
export interface BarChartData {
  name: string;
  value: number;
}

export interface RadarChartData {
  subject: string;
  value: number;
  fullMark: number;
}

export interface ScatterChartData {
  x: number;
  y: number;
  name: string;
}

