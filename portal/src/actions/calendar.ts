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
  startStr: string, 
  endStr: string, 
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
    dtstart = startStr.replace(/-/g, '');
    // End date is exclusive in iCal for all-day events, so add 1 day
    const endPlusOne = new Date(endStr);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    dtend = endPlusOne.toISOString().split('T')[0].replace(/-/g, '');
  } else {
    // startStr is like "2026-05-27T03:00" -> format to "20260527T030000"
    dtstart = startStr.replace(/[-:]/g, '').replace('T', 'T') + '00';
    dtend = endStr.replace(/[-:]/g, '').replace('T', 'T') + '00';
  }

  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyWorkspace Calendar
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
${allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART;TZID=Asia/Jakarta:${dtstart}`}
${allDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND;TZID=Asia/Jakarta:${dtend}`}
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
  href: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
};
export async function updateCalendarEvent(
  href: string,
  summary: string, 
  startStr: string, 
  endStr: string, 
  location?: string, 
  description?: string, 
  allDay?: boolean
) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  // Extract uid from href (e.g., /remote.php/dav/calendars/admin/personal/some-uid.ics)
  const uidMatch = href.match(/\/([^\/]+)\.ics$/);
  const uid = uidMatch ? uidMatch[1] : uuidv4();
  
  const dtstamp = formatDateToICal(new Date());
  
  let dtstart, dtend;
  if (allDay) {
    dtstart = startStr.replace(/-/g, '');
    const endPlusOne = new Date(endStr);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    dtend = endPlusOne.toISOString().split('T')[0].replace(/-/g, '');
  } else {
    dtstart = startStr.replace(/[-:]/g, '').replace('T', 'T') + '00';
    dtend = endStr.replace(/[-:]/g, '').replace('T', 'T') + '00';
  }

  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyWorkspace Calendar
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
${allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART;TZID=Asia/Jakarta:${dtstart}`}
${allDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND;TZID=Asia/Jakarta:${dtend}`}
SUMMARY:${summary}
${location ? `LOCATION:${location.replace(/\n/g, '\\n')}` : ''}
${description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : ''}
END:VEVENT
END:VCALENDAR`;

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: href,
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
        reject(new Error(`Failed to update event: ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.write(icsData);
    req.end();
  });
}

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
  // Robust regex for XML parsing the href and calendar-data
  const regex = /<[^>]*?href>([^<]+)<\/[^>]*?href>[\s\S]*?<[^>]*?calendar-data>([\s\S]*?)<\/[^>]*?calendar-data>/gi;
  let match;
  while ((match = regex.exec(xmlStr)) !== null) {
    const href = match[1];
    const icsContent = match[2];
    
    // Extract fields
    const uidMatch = icsContent.match(/UID:(.+?)(\r\n|\n)/);
    const summaryMatch = icsContent.match(/SUMMARY:(.+?)(\r\n|\n)/);
    const startMatch = icsContent.match(/DTSTART(?:[^:]*)?:(.+?)(\r\n|\n)/);
    const endMatch = icsContent.match(/DTEND(?:[^:]*)?:(.+?)(\r\n|\n)/);
    const locationMatch = icsContent.match(/LOCATION:(.+?)(\r\n|\n)/);
    const descriptionMatch = icsContent.match(/DESCRIPTION:(.+?)(\r\n|\n)/);

    if (uidMatch && summaryMatch && startMatch) {
      events.push({
        id: uidMatch[1].trim(),
        href: href,
        summary: summaryMatch[1].trim(),
        start: startMatch[1].trim(),
        end: endMatch ? endMatch[1].trim() : startMatch[1].trim(),
        location: locationMatch ? locationMatch[1].trim().replace(/\\n/g, '\n') : undefined,
        description: descriptionMatch ? descriptionMatch[1].trim().replace(/\\n/g, '\n') : undefined
      });
    }
  }

  return events;
}
