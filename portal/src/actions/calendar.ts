"use server";

import * as http from "http";
import { auth } from "@/auth";

const CALENDAR_URL = '/remote.php/dav/calendars/admin/personal/';
const USERNAME = "admin";
const PASSWORD = "admin";

// Simple random UUID generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Convert Date to iCal format: YYYYMMDDTHHMMSSZ
function formatDateToICal(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function createCalendarEvent(
  summary: string, 
  start: Date, 
  end: Date, 
  location?: string, 
  description?: string, 
  allDay?: boolean
) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const uid = uuidv4();
  const dtstamp = formatDateToICal(new Date());
  
  let dtstart, dtend;
  if (allDay) {
    // For all-day events, use YYYYMMDD format without time
    dtstart = start.toISOString().split('T')[0].replace(/-/g, '');
    // End date is exclusive in iCal for all-day events, so add 1 day
    const endPlusOne = new Date(end);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    dtend = endPlusOne.toISOString().split('T')[0].replace(/-/g, '');
  } else {
    dtstart = formatDateToICal(new Date(start));
    dtend = formatDateToICal(new Date(end));
  }

  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyWorkspace Calendar
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
${allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`}
${allDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`}
SUMMARY:${summary}
${location ? `LOCATION:${location.replace(/\n/g, '\\n')}` : ''}
${description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : ''}
END:VEVENT
END:VCALENDAR`;

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: `${CALENDAR_URL}${uid}.ics`,
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")}`,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Length': Buffer.byteLength(icsData),
        'Host': 'localhost'
      }
    };
    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Failed to create event: ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.write(icsData);
    req.end();
  });
}

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
};

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const session = await auth();
  if (!session) return [];

  const xml = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:prop>
        <d:getetag />
        <c:calendar-data />
    </d:prop>
    <c:filter>
        <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT" />
        </c:comp-filter>
    </c:filter>
</c:calendar-query>`;

  const xmlStr = await new Promise<string>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: CALENDAR_URL,
      method: 'REPORT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64")}`,
        'Depth': '1',
        'Host': 'localhost',
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xml)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(xml);
    req.end();
  });

  const events: CalendarEvent[] = [];
  
  // Very basic regex-based ICS parser for our demo
  // A robust implementation would use something like ical.js
  const regex = /<cal:calendar-data>(.*?)<\/cal:calendar-data>/gs;
  let match;
  while ((match = regex.exec(xmlStr)) !== null) {
    const icsContent = match[1];
    
    // Extract fields
    const uidMatch = icsContent.match(/UID:(.+?)(\r\n|\n)/);
    const summaryMatch = icsContent.match(/SUMMARY:(.+?)(\r\n|\n)/);
    const startMatch = icsContent.match(/DTSTART(?:[^:]*)?:(.+?)(\r\n|\n)/);
    const endMatch = icsContent.match(/DTEND(?:[^:]*)?:(.+?)(\r\n|\n)/);

    if (uidMatch && summaryMatch && startMatch) {
      events.push({
        id: uidMatch[1],
        summary: summaryMatch[1],
        start: startMatch[1],
        end: endMatch ? endMatch[1] : startMatch[1]
      });
    }
  }

  return events;
}
