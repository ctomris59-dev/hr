"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";

interface LeaveRequest {
  personel: string;
  tur: string;
  durum: string;
  baslangic?: string;
  bitis?: string;
  baslangic_tarihi?: string;
  bitis_tarihi?: string;
  start_date?: string;
  end_date?: string;
}

interface Holiday {
  name: string;
  date: string;
}

interface LeaveCalendarProps {
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  userName: string;
}

export default function LeaveCalendar({ leaveRequests, holidays, userName }: LeaveCalendarProps) {
  const events = useMemo(() => {
    const items: any[] = [];

    holidays.forEach((holiday) => {
      items.push({
        title: holiday.name,
        start: holiday.date,
        backgroundColor: "#ef4444",
        borderColor: "#dc2626",
        textColor: "#ffffff",
        display: "background",
      });
    });

    leaveRequests
      .filter((r) => r.durum === "Onaylandı")
      .forEach((req) => {
        const start = req.baslangic || req.baslangic_tarihi || req.start_date;
        const end = req.bitis || req.bitis_tarihi || req.end_date;
        if (start && end) {
          items.push({
            title: `${req.personel} - ${req.tur}`,
            start,
            end,
            backgroundColor: "#10b981",
            borderColor: "#059669",
            textColor: "#ffffff",
          });
        }
      });

    leaveRequests
      .filter((r) => r.personel === userName && r.durum !== "Onaylandı")
      .forEach((req) => {
        const start = req.baslangic || req.baslangic_tarihi || req.start_date;
        const end = req.bitis || req.bitis_tarihi || req.end_date;
        if (start && end) {
          items.push({
            title: `${req.tur} (${req.durum})`,
            start,
            end,
            backgroundColor: "#fbbf24",
            borderColor: "#f59e0b",
            textColor: "#ffffff",
          });
        }
      });

    return items;
  }, [holidays, leaveRequests, userName]);

  return (
    <div className="leave-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={trLocale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth",
        }}
        buttonText={{
          today: "Bugün",
          month: "Ay",
          week: "Hafta",
          day: "Gün",
        }}
        events={events}
        height="auto"
      />
      <style jsx global>{`
        .leave-calendar .fc {
          --fc-border-color: #e5e7eb;
        }
        .leave-calendar .fc .fc-scrollgrid,
        .leave-calendar .fc .fc-scrollgrid table {
          border-radius: 12px;
          overflow: hidden;
        }
        .leave-calendar .fc .fc-daygrid-day-frame {
          border-radius: 8px;
        }
        .leave-calendar .fc .fc-day-sat .fc-daygrid-day-frame,
        .leave-calendar .fc .fc-day-sun .fc-daygrid-day-frame {
          background-color: #f9fafb;
        }
        .leave-calendar .fc .fc-day-today .fc-daygrid-day-frame {
          box-shadow: inset 0 0 0 2px #3b82f6;
          border-radius: 10px;
        }
        .leave-calendar .fc .fc-day-today .fc-daygrid-day-number {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          color: #1d4ed8;
          border-radius: 9999px;
          padding: 2px 6px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
