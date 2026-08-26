import { API_BASE_URL } from "@/lib/apiConfig";
// Survey Service - Haftalık Nabız Anketi API çağrıları


export interface PulseStatusResponse {
  success: boolean;
  hasSubmitted: boolean;
  weekStart: string;
}

export interface PulseSubmitRequest {
  user_name: string;
  score: number; // 1-10 arası
  feedback?: string;
  department_id?: string;
}

export interface PulseSubmitResponse {
  success: boolean;
  message: string;
}

export interface PulseAnswer {
  id: number;
  user_name: string;
  score: number;
  feedback: string;
  department_id: string;
  week_start: string;
  submitted_at: string;
}

export interface PulseDataResponse {
  success: boolean;
  data: PulseAnswer[];
}

/**
 * Kullanıcının bu hafta için anket durumunu kontrol eder
 */
export async function checkPulseStatus(userName: string): Promise<PulseStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pulse/status?user_name=${encodeURIComponent(userName)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Pulse status check error:", error);
    return {
      success: false,
      hasSubmitted: false,
      weekStart: ""
    };
  }
}

/**
 * Haftalık nabız anketi cevabını gönderir
 */
export async function submitPulseAnswer(request: PulseSubmitRequest): Promise<PulseSubmitResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pulse/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Pulse submit error:", error);
    throw error;
  }
}

/**
 * Nabız anketi verilerini getirir (Dashboard için)
 */
export async function getPulseData(department?: string): Promise<PulseAnswer[]> {
  try {
    const url = department 
      ? `${API_BASE_URL}/api/pulse/data?department=${encodeURIComponent(department)}`
      : `${API_BASE_URL}/api/pulse/data`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: PulseDataResponse = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Pulse data fetch error:", error);
    return [];
  }
}


