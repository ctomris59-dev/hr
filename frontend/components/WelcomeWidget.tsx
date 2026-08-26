"use client";

import { useEffect, useState, useMemo } from "react";
import { Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, Eye, Clock } from "lucide-react";
import { getStorageData, STORAGE_KEYS } from "../app/utils/storage";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  location: string;
}

// WMO Weather Code Mapping
const WMO_WEATHER_CODES: Record<number, { icon: any; description: string }> = {
  0: { icon: Sun, description: "Açık" },
  1: { icon: Cloud, description: "Çoğunlukla Açık" },
  2: { icon: Cloud, description: "Parçalı Bulutlu" },
  3: { icon: Cloud, description: "Kapalı" },
  45: { icon: Eye, description: "Sis" },
  48: { icon: Eye, description: "Donlu Sis" },
  51: { icon: CloudDrizzle, description: "Hafif Çiseleme" },
  53: { icon: CloudDrizzle, description: "Orta Çiseleme" },
  55: { icon: CloudDrizzle, description: "Yoğun Çiseleme" },
  56: { icon: CloudDrizzle, description: "Hafif Donan Çiseleme" },
  57: { icon: CloudDrizzle, description: "Yoğun Donan Çiseleme" },
  61: { icon: CloudRain, description: "Hafif Yağmur" },
  63: { icon: CloudRain, description: "Orta Yağmur" },
  65: { icon: CloudRain, description: "Yoğun Yağmur" },
  66: { icon: CloudRain, description: "Hafif Donan Yağmur" },
  67: { icon: CloudRain, description: "Yoğun Donan Yağmur" },
  71: { icon: CloudSnow, description: "Hafif Kar" },
  73: { icon: CloudSnow, description: "Orta Kar" },
  75: { icon: CloudSnow, description: "Yoğun Kar" },
  77: { icon: CloudSnow, description: "Kar Taneleri" },
  80: { icon: CloudRain, description: "Hafif Sağanak" },
  81: { icon: CloudRain, description: "Orta Sağanak" },
  82: { icon: CloudRain, description: "Yoğun Sağanak" },
  85: { icon: CloudSnow, description: "Hafif Kar Sağanağı" },
  86: { icon: CloudSnow, description: "Yoğun Kar Sağanağı" },
  95: { icon: CloudLightning, description: "Fırtına" },
  96: { icon: CloudLightning, description: "Dolu ile Fırtına" },
  99: { icon: CloudLightning, description: "Şiddetli Dolu ile Fırtına" },
};

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DAYS_TR = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"
];

export default function WelcomeWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");

  // Update time on client
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Get user name - update when storage changes
  useEffect(() => {
    const loadUserName = () => {
      const currentUser = getStorageData(STORAGE_KEYS.CURRENT_USER, null);
      if (currentUser && typeof currentUser === "object" && "name" in currentUser) {
        setUserName((currentUser as any).name || "Kullanıcı");
      } else {
        setUserName("Kullanıcı");
      }
    };

    // Load on mount
    loadUserName();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CURRENT_USER) {
        loadUserName();
      }
    };

    const handleCustomStorageChange = () => {
      loadUserName();
    };

    const handleUserChanged = () => {
      loadUserName();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("storageCleared", handleCustomStorageChange);
    window.addEventListener("userChanged", handleUserChanged);
    
    // Check periodically
    const interval = setInterval(loadUserName, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storageCleared", handleCustomStorageChange);
      window.removeEventListener("userChanged", handleUserChanged);
      clearInterval(interval);
    };
  }, []);

  // Set greeting based on time
  useEffect(() => {
    if (!now) {
      setGreeting("");
      return;
    }
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Günaydın");
    } else if (hour >= 12 && hour < 17) {
      setGreeting("Tünaydın");
    } else if (hour >= 17 && hour < 22) {
      setGreeting("İyi Akşamlar");
    } else {
      setGreeting("İyi Geceler");
    }
  }, [now]);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        let lat = 41.0082; // Istanbul default
        let lon = 28.9784;

        // Try to get user's location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              lat = position.coords.latitude;
              lon = position.coords.longitude;
              fetchWeatherData(lat, lon);
            },
            () => {
              // Permission denied or error, use Istanbul
              fetchWeatherData(lat, lon);
            },
            { timeout: 5000 }
          );
        } else {
          // Geolocation not supported, use Istanbul
          fetchWeatherData(lat, lon);
        }
      } catch (error) {
        console.error("Weather fetch error:", error);
      }
    };

    const fetchWeatherData = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
        );

        if (response.ok) {
          const data = await response.json();
          const current = data.current_weather;
          
          // Get location name (reverse geocoding - simplified)
          let locationName = "Konumunuz";
          if (Math.abs(latitude - 41.0082) < 0.1 && Math.abs(longitude - 28.9784) < 0.1) {
            locationName = "İstanbul";
          } else if (Math.abs(latitude - 39.9334) < 0.1 && Math.abs(longitude - 32.8597) < 0.1) {
            locationName = "Ankara";
          } else if (Math.abs(latitude - 38.4237) < 0.1 && Math.abs(longitude - 27.1428) < 0.1) {
            locationName = "İzmir";
          }

          const weatherCode = current.weathercode;
          const weatherInfo = WMO_WEATHER_CODES[weatherCode] || { icon: Cloud, description: "Bilinmiyor" };

          setWeather({
            temperature: Math.round(current.temperature),
            weatherCode,
            description: weatherInfo.description,
            location: locationName,
          });
        }
      } catch (error) {
        console.error("Weather API error:", error);
      }
    };

    fetchWeather();
  }, []);

  // Format date and time
  const formatDateTime = () => {
    if (!now) return "";
    const day = now.getDate();
    const month = MONTHS_TR[now.getMonth()];
    const dayName = DAYS_TR[now.getDay()];
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    
    return `${day} ${month}, ${dayName} - ${hours}:${minutes}`;
  };

  const timeText = useMemo(() => {
    if (!now) return "";
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }, [now]);

  const nowText = useMemo(() => {
    if (!now) return "";
    return formatDateTime();
  }, [now]);

  const WeatherIcon = weather ? WMO_WEATHER_CODES[weather.weatherCode]?.icon || Cloud : Cloud;

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Greeting & User Name */}
      <div className="flex items-center gap-2">
        <span className="text-slate-600 dark:text-slate-400 text-sm">{greeting},</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{userName}</span>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>

      {/* Date & Time */}
      <div className="hidden lg:flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <Clock className="w-3.5 h-3.5 mr-1" />
        <span className="text-xs">{nowText}</span>
      </div>

      {/* Weather - Compact */}
      {weather && (
        <>
          <div className="hidden lg:block h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
          <div 
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 group relative"
            title={`${weather.location} - ${weather.description}`}
          >
            <WeatherIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{weather.temperature}°C</span>
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
              <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                <div className="font-semibold mb-1">{weather.location}</div>
                <div className="text-slate-300">{weather.description}</div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                  <div className="border-4 border-transparent border-t-slate-900"></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile: Compact single line */}
      <div className="lg:hidden flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="w-3 h-3" />
        <span>{timeText}</span>
        {weather && (
          <>
            <span>•</span>
            <WeatherIcon className="w-3.5 h-3.5" />
            <span>{weather.temperature}°C</span>
          </>
        )}
      </div>
    </div>
  );
}

