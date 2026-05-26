import { auth } from "@/auth";
import { getNextcloudData } from "@/actions/nextcloud";
import { getPendingTasks } from "@/actions/odoo";
import { getUnreadEmails } from "@/actions/sogo";

export default async function DashboardPage() {
  const session = await auth();
  const nextcloudData = await getNextcloudData();
  const odooTasks = await getPendingTasks();
  const sogoEmails = await getUnreadEmails();

  return (
    <div className="p-8 pt-6">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 mt-1">Welcome back, {session?.user?.name || "User"}! Here's your workspace overview.</p>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-proton-card-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-600 font-semibold text-sm">Nextcloud Storage</p>
              <h3 className="text-xl font-bold mt-1">{nextcloudData.storage?.used || "0 GB"} <span className="text-slate-400 font-normal text-sm">/ {nextcloudData.storage?.total || "0 GB"}</span></h3>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-proton-card-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-600 font-semibold text-sm">Email (SOGO)</p>
              <h3 className="text-xl font-bold mt-1">{sogoEmails.count}</h3>
              <p className="text-slate-400 text-xs mt-1">Unread Emails</p>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-proton-card-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-600 font-semibold text-sm">Odoo Tasks</p>
              <h3 className="text-xl font-bold mt-1">{odooTasks.count}</h3>
              <p className="text-slate-400 text-xs mt-1">Pending Tasks</p>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-proton-card-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-600 font-semibold text-sm">Active Projects</p>
              <h3 className="text-xl font-bold mt-1">5</h3>
              <p className="text-slate-400 text-xs mt-1">Ongoing</p>
            </div>
            <div className="bg-orange-50 p-2 rounded-lg">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <section className="bg-white p-8 rounded-2xl border border-proton-card-border shadow-sm hover:shadow-md transition-shadow">
          <h4 className="text-lg font-bold text-slate-800 mb-8">Quick Access Apps</h4>
          <div className="grid grid-cols-3 gap-y-10">
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:-translate-y-1">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              </div>
              <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600">Nextcloud</span>
            </div>
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:-translate-y-1">
                <svg className="w-6 h-6 text-emerald-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              </div>
              <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-600">SOGO</span>
            </div>
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-all transform group-hover:-translate-y-1">
                <svg className="w-6 h-6 text-purple-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
              </div>
              <span className="text-xs font-medium text-slate-500 group-hover:text-purple-600">Odoo</span>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-proton-card-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold text-slate-800">Recent Files (Nextcloud)</h4>
            <a className="text-blue-600 text-xs font-bold hover:underline" href="#">View All</a>
          </div>
          <div className="space-y-4">
            {nextcloudData.files.map((file: any, index: number) => (
              <div key={index} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors -mx-2">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 ${file.bg} rounded-lg flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${file.color}`} fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                </div>
                <span className="text-xs text-slate-400">{file.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
