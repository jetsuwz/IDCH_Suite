"use client";

import React, { useState, useEffect } from "react";
import { getCalendarEvents, createCalendarEvent, CalendarEvent } from "@/actions/calendar";

export default function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
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

    setIsCreateModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle) return alert("Title is required");
    
    try {
      const startDate = new Date(`${eventStartDate}T${eventAllDay ? '00:00' : eventStartTime}`);
      const endDate = new Date(`${eventEndDate}T${eventAllDay ? '00:00' : eventEndTime}`);
      await createCalendarEvent(eventTitle, startDate, endDate, eventLocation, eventDescription, eventAllDay);
      setIsCreateModalOpen(false);
      fetchEvents();
    } catch (e) {
      alert("Failed to create event");
    }
  };

  // Helper to check if an event is on a specific Date
  const getEventsForDay = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const targetDateString = targetDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    return events.filter(e => {
      // e.start format is YYYYMMDDTHHMMSSZ or YYYYMMDD
      return e.start.startsWith(targetDateString);
    });
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
              <input 
                type="date"
                className="flex-1 bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                value={eventStartDate}
                onChange={e => setEventStartDate(e.target.value)}
              />
              {!eventAllDay && (
                <input 
                  type="time" 
                  className="w-32 bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  value={eventStartTime}
                  onChange={e => setEventStartTime(e.target.value)}
                />
              )}
              <span className="text-slate-400">to</span>
              <input 
                type="date"
                className="flex-1 bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                value={eventEndDate}
                onChange={e => setEventEndDate(e.target.value)}
              />
              {!eventAllDay && (
                <input 
                  type="time" 
                  className="w-32 bg-[#1e1e1e] border border-slate-600 rounded-lg text-sm text-slate-300 px-3 py-2 focus:outline-none focus:border-blue-500"
                  value={eventEndTime}
                  onChange={e => setEventEndTime(e.target.value)}
                />
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

        {/* My Calendars Filter */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Calendars</h3>
            <button className="text-slate-400 hover:text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
          </div>
          <div className="space-y-4">
            <label className="flex items-center group cursor-pointer">
              <input defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 w-5 h-5" type="checkbox"/>
              <span className="ml-3 text-sm text-slate-700 font-medium flex-1">Personal</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            </label>
            <label className="flex items-center group cursor-pointer">
              <input defaultChecked className="rounded border-slate-300 text-green-500 focus:ring-green-500 w-5 h-5" type="checkbox"/>
              <span className="ml-3 text-sm text-slate-700 font-medium flex-1">Team Projects</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            </label>
            <label className="flex items-center group cursor-pointer">
              <input defaultChecked className="rounded border-slate-300 text-purple-500 focus:ring-purple-500 w-5 h-5" type="checkbox"/>
              <span className="ml-3 text-sm text-slate-700 font-medium flex-1">External Meetings</span>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            </label>
            <label className="flex items-center group cursor-pointer">
              <input className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-5 h-5" type="checkbox"/>
              <span className="ml-3 text-sm text-slate-700 font-medium flex-1">Holidays</span>
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            </label>
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
                    <div key={evt.id} className="p-1.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded flex items-center border-l-4 border-blue-500 truncate cursor-pointer hover:bg-blue-200">
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
             // Basic time parsing: YYYYMMDDTHHMMSSZ -> HH:MM
             let timeStr = "All Day";
             if (evt.start.includes('T')) {
                const timePart = evt.start.split('T')[1];
                if (timePart.length >= 4) {
                   timeStr = `${timePart.substring(0,2)}:${timePart.substring(2,4)}`;
                }
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
    </div>
  );
}
