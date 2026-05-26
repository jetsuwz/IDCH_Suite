"use client";

import React, { useState, useEffect, useRef } from 'react';

type DateTimePickerProps = {
  labelPrefix: "from" | "to";
  selectedDate: string; // YYYY-MM-DD
  selectedTime: string; // HH:MM (24-hour)
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

export default function DateTimePicker({ labelPrefix, selectedDate, selectedTime, onDateChange, onTimeChange }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'time' | 'date'>('time');
  const [calendarDate, setCalendarDate] = useState(new Date(selectedDate || new Date().toISOString().split('T')[0]));
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Convert HH:MM (24h) to 12h format for internal state
  const get12HourFormat = (time24: string) => {
    if (!time24) return { h: "12", m: "00", ampm: "AM" };
    const [hoursStr, minutesStr] = time24.split(":");
    let h24 = parseInt(hoursStr, 10);
    const ampm = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h: h12.toString().padStart(2, '0'), m: minutesStr, ampm };
  };

  const { h, m, ampm } = get12HourFormat(selectedTime);
  const [hour, setHour] = useState(h);
  const [minute, setMinute] = useState(m);
  const [period, setPeriod] = useState(ampm);
  
  // Format for the trigger button
  const formatDisplay = () => {
    if (!selectedDate) return "Select date";
    const [y, mo, d] = selectedDate.split('-');
    return `${labelPrefix} ${mo}/${d}/${y} at ${h}:${m} ${ampm}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeUpdate = (newHour: string, newMinute: string, newPeriod: string) => {
    setHour(newHour);
    setMinute(newMinute);
    setPeriod(newPeriod);
    
    // Convert back to 24h for onTimeChange
    let h24 = parseInt(newHour, 10);
    if (newPeriod === "PM" && h24 < 12) h24 += 12;
    if (newPeriod === "AM" && h24 === 12) h24 = 0;
    
    onTimeChange(`${h24.toString().padStart(2, '0')}:${newMinute}`);
  };

  const hoursList = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutesList = Array.from({length: 12}, (_, i) => (i * 5).toString().padStart(2, '0'));
  
  // Calendar Grid Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const daysInMonth = getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth());
  const firstDay = getFirstDayOfMonth(calendarDate.getFullYear(), calendarDate.getMonth());
  const blanks = Array.from({length: firstDay}, (_, i) => i);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const monthNames = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
  
  const handleDateSelect = (d: number) => {
    const y = calendarDate.getFullYear();
    const m = (calendarDate.getMonth() + 1).toString().padStart(2, '0');
    const day = d.toString().padStart(2, '0');
    onDateChange(`${y}-${m}-${day}`);
    setViewMode('time');
  };
  
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-200 px-4 py-2.5 focus:outline-none focus:border-blue-500 hover:bg-[#252525] flex items-center justify-between min-w-[240px]"
      >
        <span>{formatDisplay()}</span>
        <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#1e1e1e] border border-slate-700 rounded-xl shadow-2xl z-50 w-72 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#1a1a1a] p-3 text-center border-b border-slate-700">
            <span className="bg-[#2a2a2a] text-slate-300 font-bold px-4 py-1.5 rounded-full text-sm tracking-wide">
              {selectedDate}
            </span>
          </div>

          {/* Main Content Area */}
          {viewMode === 'time' ? (
            <div className="flex text-sm text-center h-56">
              {/* Hours */}
              <div className="flex-1 flex flex-col border-r border-slate-700">
                <div className="bg-[#0082c9] text-white font-bold py-1.5 text-xs">{hour}</div>
                <div className="overflow-y-auto scrollbar-hide flex-1 py-2 space-y-1">
                  {hoursList.map(v => (
                    <div 
                      key={v} 
                      onClick={() => handleTimeUpdate(v, minute, period)}
                      className={`cursor-pointer py-1.5 ${hour === v ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              </div>
              {/* Minutes */}
              <div className="flex-1 flex flex-col border-r border-slate-700">
                <div className="bg-[#0082c9] text-white font-bold py-1.5 text-xs">{minute}</div>
                <div className="overflow-y-auto scrollbar-hide flex-1 py-2 space-y-1">
                  {minutesList.map(v => (
                    <div 
                      key={v} 
                      onClick={() => handleTimeUpdate(hour, v, period)}
                      className={`cursor-pointer py-1.5 ${minute === v ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              </div>
              {/* AM/PM */}
              <div className="flex-1 flex flex-col">
                <div className="bg-[#0082c9] text-white font-bold py-1.5 text-xs">{period}</div>
                <div className="flex-1 py-4 space-y-2">
                  <div 
                    onClick={() => handleTimeUpdate(hour, minute, "AM")}
                    className={`cursor-pointer py-1.5 ${period === "AM" ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    AM
                  </div>
                  <div 
                    onClick={() => handleTimeUpdate(hour, minute, "PM")}
                    className={`cursor-pointer py-1.5 ${period === "PM" ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    PM
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 h-56 flex flex-col">
              <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex space-x-1">
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear()-1, calendarDate.getMonth(), 1))} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-xs">&laquo;</button>
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth()-1, 1))} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-xs">&lsaquo;</button>
                </div>
                <div className="flex space-x-2">
                  <span className="font-bold text-white text-sm bg-[#2a2a2a] px-2 py-0.5 rounded-full">{monthNames[calendarDate.getMonth()]}</span>
                  <span className="font-bold text-white text-sm bg-[#2a2a2a] px-2 py-0.5 rounded-full">{calendarDate.getFullYear()}</span>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth()+1, 1))} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-xs">&rsaquo;</button>
                  <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear()+1, calendarDate.getMonth(), 1))} className="w-6 h-6 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-xs">&raquo;</button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 font-medium mb-1">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs flex-1">
                {blanks.map(b => <div key={`blank-${b}`} className="p-1"></div>)}
                {days.map(d => {
                  const isSelected = selectedDate === `${calendarDate.getFullYear()}-${(calendarDate.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                  return (
                    <div 
                      key={d} 
                      onClick={() => handleDateSelect(d)}
                      className={`p-1 cursor-pointer flex items-center justify-center rounded ${isSelected ? 'bg-[#0082c9] text-white font-bold' : 'text-slate-300 hover:bg-[#2a2a2a]'}`}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-3 border-t border-slate-700 flex justify-between items-center bg-[#1a1a1a]">
            <button 
              type="button"
              onClick={() => setViewMode(viewMode === 'time' ? 'date' : 'time')}
              className="bg-[#2a2a2a] text-slate-400 hover:text-slate-200 px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
            >
              {viewMode === 'time' ? 'Pick a date' : 'Pick a time'}
            </button>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-[#0082c9] text-white px-5 py-1.5 rounded-full text-xs font-bold hover:bg-[#006ca8] transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
