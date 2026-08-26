import { UserPlus } from "lucide-react";

export default function IseAlimPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">İşe Alım (Admin)</h1>
            <p className="text-slate-600 mt-1">
              Aday yönetimi ve işe alım süreçleri
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <UserPlus className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">
          İşe alım modülü yakında eklenecek
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Aday testi için /aday-testi sayfasını kullanabilirsiniz
        </p>
      </div>
    </div>
  );
}



