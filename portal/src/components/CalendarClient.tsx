"use client";

import React, { useState, useEffect } from "react";
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, CalendarEvent } from "@/actions/calendar";
import DateTimePicker from "./DateTimePicker";

export default function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number, y: number, side: 'left' | 'right' } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(true);
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const fetchEvents = async () => {
    setIsFetching(true);
    try {
      const data = await getCalendarEvents();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchEvents();
  }, []);

  if (!isMounted) {
    return <div className="flex-1 flex overflow-hidden p-6 gap-6 h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  // Generate calendar grid for the current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    // Next month padding
    const totalSlots = Math.ceil(days.length / 7) * 7;
    let nextDay = 1;
    while (days.length < totalSlots) {
      days.push({ day: nextDay++, isCurrentMonth: false });
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleOpenCreateModal = () => {
    setEventTitle("");
    setEventLocation("");
    setEventDescription("");
    setEventAllDay(false);
    
    // Default to tomorrow 10:00 to 11:00
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    // Format for date and time inputs
    const toLocalISO = (d: Date) => {
       const tzOffset = d.getTimezoneOffset() * 60000;
       return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16).split('T');
    };

    const [startD, startT] = toLocalISO(start);
    const [endD, endT] = toLocalISO(end);

    setEventStartDate(startD);
    setEventStartTime(startT);
    setEventEndDate(endD);
    setEventEndTime(endT);
    setEventAllDay(true);

    setIsCreateModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle) return alert("Title is required");
    
    try {
      const startStr = `${eventStartDate}T${eventAllDay ? '00:00' : eventStartTime}`;
      const endStr = `${eventEndDate}T${eventAllDay ? '00:00' : eventEndTime}`;
      await createCalendarEvent(eventTitle, startStr, endStr, eventLocation, eventDescription, eventAllDay);
      setIsCreateModalOpen(false);
      fetchEvents();
    } catch (e) {
      alert("Failed to create event");
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent || !eventTitle) return alert("Title is required");
    
    try {
      const startStr = `${eventStartDate}T${eventAllDay ? '00:00' : eventStartTime}`;
      const endStr = `${eventEndDate}T${eventAllDay ? '00:00' : eventEndTime}`;
      await updateCalendarEvent(selectedEvent.href, eventTitle, startStr, endStr, eventLocation, eventDescription, eventAllDay);
      setIsEditMode(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (e) {
      alert("Failed to update event");
    }
  };

  // Helper to check if an event is on a specific Date
  const getEventsForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    
    return events.filter(e => {
      if (!e.start) return false;
      
      // All day event: YYYYMMDD
      if (!e.start.includes('T') && e.start.length >= 8) {
         const y = parseInt(e.start.substring(0,4));
         const m = parseInt(e.start.substring(4,6)) - 1;
         const d = parseInt(e.start.substring(6,8));
         return y === currentDate.getFullYear() && m === currentDate.getMonth() && d === day;
      }
      
      // Timed event: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
      if (e.start.length >= 15) {
         const y = e.start.substring(0,4);
         const m = e.start.substring(4,6);
         const d = e.start.substring(6,8);
         const h = e.start.substring(9,11);
         const min = e.start.substring(11,13);
         const s = e.start.substring(13,15);
         
         const isUTC = e.start.endsWith('Z');
         // If it's UTC, parse with Z to convert to local. If it's local, parse without Z.
         const parsedDate = new Date(`${y}-${m}-${d}T${h}:${min}:${s}${isUTC ? 'Z' : ''}`);
         
         return parsedDate.getFullYear() === currentDate.getFullYear() && 
                parsedDate.getMonth() === currentDate.getMonth() && 
                parsedDate.getDate() === day;
      }
      return false;
    });
  };

  const formatEventTimeForDetail = (icsTimeStr: string) => {
    if (!icsTimeStr) return "";
    if (!icsTimeStr.includes('T') && icsTimeStr.length >= 8) {
      const y = parseInt(icsTimeStr.substring(0,4));
      const m = parseInt(icsTimeStr.substring(4,6)) - 1;
      const d = parseInt(icsTimeStr.substring(6,8));
      const date = new Date(y, m, d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (icsTimeStr.length >= 15) {
      const y = icsTimeStr.substring(0,4);
      const m = icsTimeStr.substring(4,6);
      const d = icsTimeStr.substring(6,8);
      const h = icsTimeStr.substring(9,11);
      const min = icsTimeStr.substring(11,13);
      const s = icsTimeStr.substring(13,15);
      const isUTC = icsTimeStr.endsWith('Z');
      const parsedDate = new Date(`${y}-${m}-${d}T${h}:${min}:${s}${isUTC ? 'Z' : ''}`);
      return parsedDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return "";
  };

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 h-full relative">
      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-slate-700 w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <input 
              type="text" 
              placeholder="Event title" 
              className="w-full bg-[#1e1e1e] border border-slate-600 rounded-lg text-white px-4 py-3 focus:outline-none focus:border-blue-500 font-semibold"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
            />
            
            <div className="flex space-x-3 items-center">
              {eventAllDay ? (
                <>
                  <input 
                    type="date"
                    className="flex-1 bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    value={eventStartDate}
                    onChange={e => setEventStartDate(e.target.value)}
                  />
                  <span className="text-slate-400 px-2">to</span>
                  <input 
                    type="date"
                    className="flex-1 bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    value={eventEndDate}
                    onChange={e => setEventEndDate(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <DateTimePicker 
                    labelPrefix="from"
                    selectedDate={eventStartDate}
                    selectedTime={eventStartTime}
                    onDateChange={setEventStartDate}
                    onTimeChange={setEventStartTime}
                  />
                  <span className="text-slate-400">to</span>
                  <DateTimePicker 
                    labelPrefix="to"
                    selectedDate={eventEndDate}
                    selectedTime={eventEndTime}
                    onDateChange={setEventEndDate}
                    onTimeChange={setEventEndTime}
                  />
                </>
              )}
            </div>

            <label className="flex items-center space-x-3 text-slate-200 text-sm cursor-pointer px-1">
              <input 
                type="checkbox" 
                className="rounded border-slate-500 bg-transparent text-blue-500 focus:ring-0 focus:ring-offset-0 w-5 h-5"
                checked={eventAllDay}
                onChange={e => setEventAllDay(e.target.checked)}
              />
              <span>All day</span>
            </label>

            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <input 
                  type="text" 
                  placeholder="Add a location" 
                  className="w-full bg-[#1e1e1e] border border-slate-600 rounded-lg text-slate-300 text-sm px-4 py-3 focus:outline-none focus:border-blue-500"
                  value={eventLocation}
                  onChange={e => setEventLocation(e.target.value)}
                />
              </div>
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-slate-400 shrink-0 mt-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                <textarea 
                  placeholder="Add a description" 
                  className="w-full bg-[#1e1e1e] border border-slate-600 rounded-lg text-slate-300 text-sm px-4 py-3 focus:outline-none focus:border-blue-500 min-h-[80px]"
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end items-center space-x-3 mt-4">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 rounded-full text-slate-300 font-semibold hover:bg-slate-800 text-sm">Cancel</button>
              <button onClick={handleSaveEvent} className="px-6 py-2.5 bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 flex items-center space-x-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BEGIN: LeftControlPanel */}
      <section className="w-64 flex flex-col gap-6 shrink-0">
        <button onClick={handleOpenCreateModal} className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Create Event</span>
        </button>

        {/* Mini Calendar Picker */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-bold text-slate-800 text-sm">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
            <div className="flex space-x-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded"><svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded"><svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-xs mb-2 text-slate-400 font-medium">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>
          <div className="grid grid-cols-7 text-center text-xs gap-y-2">
            {days.map((d, idx) => (
              <span key={idx} className={`${!d.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'} ${d.day === new Date().getDate() && d.isCurrentMonth && currentDate.getMonth() === new Date().getMonth() ? 'bg-blue-600 text-white rounded-full flex items-center justify-center w-6 h-6 mx-auto' : 'flex items-center justify-center w-6 h-6 mx-auto'}`}>
                {d.day}
              </span>
            ))}
          </div>
        </div>


      </section>

      {/* BEGIN: CalendarGridArea */}
      <section className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button onClick={handleToday} className="px-4 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Today</button>
            <div className="flex items-center space-x-2">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button className="px-4 py-1 text-sm font-medium text-slate-600">Day</button>
            <button className="px-4 py-1 text-sm font-medium text-slate-600">Week</button>
            <button className="px-4 py-1 text-sm font-medium text-blue-600 bg-white rounded-md shadow-sm">Month</button>
          </div>
        </div>

        {/* Grid Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase">{day}</div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(100px,1fr)] divide-x divide-y divide-slate-100 overflow-y-auto">
          {days.map((d, idx) => {
            const dayEvents = getEventsForDay(d.day, d.isCurrentMonth);
            return (
              <div key={idx} className={`p-2 border-slate-200 ${!d.isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'font-medium'}`}>
                <span className={`inline-block ${d.day === new Date().getDate() && d.isCurrentMonth && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() ? 'bg-blue-600 text-white w-7 h-7 text-center leading-7 rounded-full' : ''}`}>
                  {d.day}
                </span>
                
                {/* Render Actual Events */}
                <div className="mt-2 space-y-1">
                  {dayEvents.map(evt => (
                    <div 
                      key={evt.id} 
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const popoverWidth = 440;
                        let side: 'left' | 'right' = 'left';
                        let x = rect.left - popoverWidth - 16;
                        
                        // If no space on the left, put it on the right
                        if (x < 10) {
                          side = 'right';
                          x = rect.right + 16;
                        }
                        
                        setPopupPos({ x, y: rect.top - 20, side });
                        setSelectedEvent(evt);
                        setIsEditMode(false);
                      }}
                      className="p-1.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded flex items-center border-l-4 border-blue-500 truncate cursor-pointer hover:bg-blue-200 relative"
                    >
                      {evt.summary}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BEGIN: AgendaSidebar */}
      <section className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-800">Today's Agenda</h2>
          <span className="text-sm font-semibold text-blue-600">
            {getEventsForDay(new Date().getDate(), currentDate.getMonth() === new Date().getMonth()).length} Tasks
          </span>
        </div>
        <div className="space-y-6">
          {getEventsForDay(new Date().getDate(), currentDate.getMonth() === new Date().getMonth()).map(evt => {
             // Parse time accurately into local time
             let timeStr = "All Day";
             if (evt.start.includes('T') && evt.start.length >= 15) {
                const y = evt.start.substring(0,4);
                const m = evt.start.substring(4,6);
                const d = evt.start.substring(6,8);
                const h = evt.start.substring(9,11);
                const min = evt.start.substring(11,13);
                const s = evt.start.substring(13,15);
                const isUTC = evt.start.endsWith('Z');
                
                const parsedDate = new Date(`${y}-${m}-${d}T${h}:${min}:${s}${isUTC ? 'Z' : ''}`);
                const hours = parsedDate.getHours().toString().padStart(2, '0');
                const minutes = parsedDate.getMinutes().toString().padStart(2, '0');
                timeStr = `${hours}:${minutes}`;
             }
             return (
              <div key={evt.id} className="flex space-x-4">
                <div className="w-12 text-xs font-bold text-slate-400 pt-1">{timeStr}</div>
                <div className="flex-1 bg-slate-50 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-sm">{evt.summary}</h4>
                  <p className="text-xs text-slate-500 mt-1">Nextcloud Event</p>
                </div>
              </div>
             );
          })}
        </div>
        <div className="mt-8 flex-1 border-t border-dashed border-slate-200 flex items-center justify-center">
          <p className="text-xs text-slate-400 italic">No more events for today</p>
        </div>
      </section>

      {/* Event Details Popup Modal */}
      {selectedEvent && popupPos && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0" onClick={() => { setSelectedEvent(null); setIsEditMode(false); }}></div>
          <div 
            className="fixed bg-[#1e1e1e] border border-slate-700 rounded-xl shadow-2xl w-[440px] text-slate-200"
            style={{ 
              left: Math.max(10, popupPos.x), 
              top: Math.max(10, Math.min(popupPos.y, typeof window !== 'undefined' ? window.innerHeight - (isEditMode ? 400 : 300) : 800)) 
            }}
          >
            {/* Popover Arrow */}
            <div className={`absolute top-[28px] w-3 h-3 bg-[#1e1e1e] border-slate-700 transform rotate-45 ${popupPos.side === 'left' ? 'right-[-7px] border-t border-r' : 'left-[-7px] border-b border-l'}`}></div>

            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 relative z-10 bg-[#1e1e1e] rounded-t-xl">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 bg-[#0082c9] rounded-full"></div>
                <span className="font-bold text-sm text-slate-100">Personal</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-slate-400 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                </button>
                <button onClick={() => { setSelectedEvent(null); setIsEditMode(false); }} className="text-slate-400 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
            
            {/* Body */}
            {isEditMode ? (
              <div className="p-5 space-y-4">
                <input 
                  type="text" 
                  placeholder="Event title"
                  className="w-full bg-[#1a1a1a] border border-slate-700 rounded-lg text-white px-4 py-2.5 focus:outline-none focus:border-blue-500 font-bold"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  autoFocus
                />
                
                <div className="flex space-x-3 items-center">
                  {eventAllDay ? (
                    <>
                      <input 
                        type="date"
                        className="flex-1 bg-[#1a1a1a] border border-slate-700 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        value={eventStartDate}
                        onChange={e => setEventStartDate(e.target.value)}
                      />
                      <span className="text-slate-400 px-2">to</span>
                      <input 
                        type="date"
                        className="flex-1 bg-[#1a1a1a] border border-slate-700 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:border-blue-500"
                        value={eventEndDate}
                        onChange={e => setEventEndDate(e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      <DateTimePicker 
                        labelPrefix="from"
                        selectedDate={eventStartDate}
                        selectedTime={eventStartTime}
                        onDateChange={setEventStartDate}
                        onTimeChange={setEventStartTime}
                      />
                      <DateTimePicker 
                        labelPrefix="to"
                        selectedDate={eventEndDate}
                        selectedTime={eventEndTime}
                        onDateChange={setEventEndDate}
                        onTimeChange={setEventEndTime}
                      />
                    </>
                  )}
                </div>

                <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={eventAllDay} onChange={e => setEventAllDay(e.target.checked)} className="rounded border-slate-600 bg-[#1e1e1e] text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900" />
                  <span>All day</span>
                </label>

                <div className="flex items-start space-x-3 text-sm text-slate-300 mt-4">
                  <svg className="w-5 h-5 text-slate-400 shrink-0 mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  <input 
                    type="text" 
                    placeholder="Location"
                    className="flex-1 bg-[#1a1a1a] border border-slate-700 rounded-lg text-white px-4 py-2 focus:outline-none focus:border-blue-500"
                    value={eventLocation}
                    onChange={e => setEventLocation(e.target.value)}
                  />
                </div>

                <div className="flex items-start space-x-3 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-slate-400 shrink-0 mt-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <textarea 
                    placeholder="Description"
                    rows={2}
                    className="flex-1 bg-[#1a1a1a] border border-slate-700 rounded-lg text-white px-4 py-2 focus:outline-none focus:border-blue-500"
                    value={eventDescription}
                    onChange={e => setEventDescription(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <h2 className="text-xl font-bold text-white mb-2">{selectedEvent.summary}</h2>
                
                <div className="flex items-start space-x-3 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <div>
                    {formatEventTimeForDetail(selectedEvent.start)} - {formatEventTimeForDetail(selectedEvent.end)}
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-start space-x-3 text-sm text-slate-300">
                    <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <div>{selectedEvent.location}</div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start space-x-3 text-sm text-slate-300">
                    <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <div className="whitespace-pre-wrap">{selectedEvent.description}</div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end items-center space-x-4 bg-[#1a1a1a] rounded-b-xl">
              <button className="text-sm font-bold text-slate-300 hover:text-white transition-colors">
                More details
              </button>
              {isEditMode ? (
                <button 
                  onClick={handleUpdateEvent}
                  className="bg-[#0082c9] hover:bg-[#006ca8] text-white px-5 py-2 rounded-full text-sm font-bold flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Update</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setEventTitle(selectedEvent.summary);
                    setEventLocation(selectedEvent.location || "");
                    setEventDescription(selectedEvent.description || "");
                    
                    // Simple parse back to fields
                    let sDay = "", sTime = "00:00", eDay = "", eTime = "00:00", allday = true;
                    if (selectedEvent.start.length >= 8) {
                      sDay = `${selectedEvent.start.substring(0,4)}-${selectedEvent.start.substring(4,6)}-${selectedEvent.start.substring(6,8)}`;
                    }
                    if (selectedEvent.start.length >= 15) {
                      allday = false;
                      sTime = `${selectedEvent.start.substring(9,11)}:${selectedEvent.start.substring(11,13)}`;
                    }
                    if (selectedEvent.end.length >= 8) {
                      eDay = `${selectedEvent.end.substring(0,4)}-${selectedEvent.end.substring(4,6)}-${selectedEvent.end.substring(6,8)}`;
                    }
                    if (selectedEvent.end.length >= 15) {
                      eTime = `${selectedEvent.end.substring(9,11)}:${selectedEvent.end.substring(11,13)}`;
                    } else if (allday && eDay) {
                      // end date for all day is exclusive, we might need to subtract 1 day visually, but simple parse is ok for now
                      const ed = new Date(eDay);
                      ed.setDate(ed.getDate() - 1);
                      eDay = ed.toISOString().split('T')[0];
                    }
                    
                    setEventStartDate(sDay);
                    setEventStartTime(sTime);
                    setEventEndDate(eDay);
                    setEventEndTime(eTime);
                    setEventAllDay(allday);
                    
                    setIsEditMode(true);
                  }}
                  className="bg-[#1b2b3d] hover:bg-[#253b52] text-[#5cb1ff] px-5 py-2 rounded-full text-sm font-bold flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
