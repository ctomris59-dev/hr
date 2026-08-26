// History 360 data - Backend'deki future_360_db.json'dan dönüştürüldü
export interface History360Entry {
  Personel: string;
  Departman: string;
  Pozisyon: string;
  Performans: number;
  Potansiyel: number;
  date: string;
  DIG_Mgr?: number;
  DIG_Peer?: number;
  DIG_Self?: number;
  ANA_Mgr?: number;
  ANA_Peer?: number;
  ANA_Self?: number;
  RES_Mgr?: number;
  RES_Peer?: number;
  RES_Self?: number;
  DET_Mgr?: number;
  DET_Peer?: number;
  DET_Self?: number;
  LRN_Mgr?: number;
  LRN_Peer?: number;
  LRN_Self?: number;
  ETH_Mgr?: number;
  ETH_Peer?: number;
  ETH_Self?: number;
  DIS_Mgr?: number;
  DIS_Peer?: number;
  DIS_Self?: number;
  STR_Mgr?: number;
  STR_Peer?: number;
  STR_Self?: number;
  TEA_Mgr?: number;
  TEA_Peer?: number;
  TEA_Self?: number;
  COM_Mgr?: number;
  COM_Peer?: number;
  COM_Self?: number;
}

// Varsayılan veri - localStorage'dan veya backend'den yüklenecek
export const HISTORY_360_DATA: History360Entry[] = [];



