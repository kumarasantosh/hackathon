"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingDatePickerProps {
  itemId: string;
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
  availableDates?: { date: string; available: boolean }[];
}

export function BookingDatePicker({
  itemId,
  selectedDates,
  onDatesChange,
  availableDates,
}: BookingDatePickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dates, setDates] = useState<{ date: string; available: boolean }[]>([]);

  useEffect(() => {
    // Fetch available dates if not provided
    if (!availableDates && itemId) {
      fetchAvailability();
    } else if (availableDates) {
      setDates(availableDates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, availableDates]);

  const fetchAvailability = async () => {
    if (!itemId) {
      setError("Item ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 90); // Next 90 days

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `/api/items/${encodeURIComponent(itemId)}/availability?startDate=${startDateStr}&endDate=${endDateStr}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.dates && Array.isArray(data.dates)) {
          setDates(data.dates);
        } else {
          setError("Invalid response format from server");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load available dates");
      }
    } catch (err: any) {
      console.error("Error fetching availability:", err);
      setError(err.message || "Failed to load available dates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = (dateStr: string) => {
    const date = dates.find((d) => d.date === dateStr);
    if (!date || !date.available) return;

    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr].sort());
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Group dates by month
  const groupedDates = dates.reduce((acc, dateObj) => {
    const date = new Date(dateObj.date);
    const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(dateObj);
    return acc;
  }, {} as Record<string, { date: string; available: boolean }[]>);

  if (loading && dates.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Select Booking Dates</h3>
        </div>
        <p className="text-sm text-gray-500">Loading available dates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Select Booking Dates</h3>
        <span className="text-sm text-gray-500">
          ({selectedDates.length} selected)
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
        {Object.entries(groupedDates).map(([month, monthDates]) => (
          <div key={month} className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 sticky top-0 bg-white py-1">
              {month}
            </h4>
            <div className="space-y-1">
              {/* Day headers - only show once per month */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={`header-${idx}`} className="text-xs text-gray-500 font-medium text-center p-1">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {monthDates.map((dateObj) => {
                const isSelected = selectedDates.includes(dateObj.date);
                const isAvailable = dateObj.available;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const date = new Date(dateObj.date);
                date.setHours(0, 0, 0, 0);
                const isPast = date < today;

                return (
                  <button
                    key={dateObj.date}
                    type="button"
                    onClick={() => toggleDate(dateObj.date)}
                    disabled={!isAvailable || isPast}
                    className={`
                      p-1.5 sm:p-2 text-xs sm:text-sm rounded-lg border transition-all text-center
                      ${isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-md"
                        : isAvailable && !isPast
                        ? "bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-300 text-gray-700 hover:shadow-sm"
                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      }
                      ${isPast ? "opacity-50" : ""}
                    `}
                    title={
                      isPast
                        ? "Past date"
                        : !isAvailable
                        ? "Already booked"
                        : formatDate(dateObj.date)
                    }
                  >
                    {date.getDate()}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-sm font-medium text-emerald-900 mb-2">Selected Dates:</p>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((dateStr) => (
              <span
                key={dateStr}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium"
              >
                {formatDateShort(dateStr)}
                <button
                  type="button"
                  onClick={() => toggleDate(dateStr)}
                  className="hover:bg-emerald-700 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedDates.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          Please select at least one date to proceed with your booking request.
        </p>
      )}
    </div>
  );
}

