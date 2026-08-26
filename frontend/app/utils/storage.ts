// localStorage yönetimi - Veri senkronizasyonu için
export const STORAGE_KEYS = {
  USERS: "hr_users",
  ORG_CHART: "hr_org_chart",
  HISTORY_360: "hr_history_360",
  LEAVE_REQUESTS: "hr_leave_requests",
  CURRENT_USER: "hr_current_user",
  CANDIDATE_RESULTS: "hr_candidate_results",
  CANDIDATES: "hr_candidates",
  TRAINING_ASSIGNMENTS: "hr_training_assignments",
  PULSE_ANSWERS: "hr_pulse_answers",
};

export function getStorageData<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Storage error:", error);
  }
}

export function clearStorage(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// Merkezi veri temizleme fonksiyonu - TÜM modüllerde kullanılmalı
export function clearAllHRData(): void {
  if (typeof window === "undefined") return;
  
  // Kullanıcı bilgilerini koru
  const currentUserHr = localStorage.getItem("hr_current_user");
  const currentUser = localStorage.getItem("user");
  
  // TÜM hr_ ile başlayan key'leri temizle (kullanıcı bilgileri hariç)
  const allHrKeys = Object.keys(localStorage).filter(key => 
    key.startsWith("hr_") && 
    key !== "hr_current_user" && 
    key !== "hr_data_cleared"
  );
  allHrKeys.forEach(key => localStorage.removeItem(key));
  
  // STORAGE_KEYS'deki tüm key'leri boş array/object olarak set et (key'leri silmek yerine)
  // Çünkü bazı modüller key'in varlığını kontrol ediyor
  setStorageData(STORAGE_KEYS.ORG_CHART, []);
  setStorageData(STORAGE_KEYS.HISTORY_360, []);
  setStorageData(STORAGE_KEYS.LEAVE_REQUESTS, []);
  setStorageData(STORAGE_KEYS.CANDIDATE_RESULTS, []);
  setStorageData(STORAGE_KEYS.CANDIDATES, []);
  setStorageData(STORAGE_KEYS.TRAINING_ASSIGNMENTS, []);
  setStorageData(STORAGE_KEYS.PULSE_ANSWERS, []);
  setStorageData(STORAGE_KEYS.USERS, {});
  
  // Ek key'leri de temizle
  localStorage.removeItem("hr_talent_matrix");
  localStorage.removeItem("hr_org_chart_data");
  localStorage.removeItem("hr_360_data");
  localStorage.removeItem("market_data_ref");
  
  // Kullanıcı bilgilerini geri yükle
  if (currentUserHr) {
    localStorage.setItem("hr_current_user", currentUserHr);
  }
  if (currentUser) {
    localStorage.setItem("user", currentUser);
  }
  
  // Flag'i set et
  localStorage.setItem("hr_data_cleared", "true");
  
  // TÜM modüllere bildir
  window.dispatchEvent(new CustomEvent("storageCleared"));
  
  console.log("[clearAllHRData] Tüm HR verileri temizlendi");
}

