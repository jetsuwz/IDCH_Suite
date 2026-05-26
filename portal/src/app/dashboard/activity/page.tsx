export default function ActivityPage() {
  return (
    <div className="mb-10">
      <h2 className="text-3xl font-bold text-slate-900">Activity Log</h2>
      <p className="text-slate-500 mt-1">Review recent actions across the workspace.</p>
      
      <div className="mt-8 bg-white p-8 rounded-2xl border border-proton-card-border shadow-sm">
        <p className="text-slate-600">This module will aggregate activity streams from Nextcloud, Odoo, and other services.</p>
      </div>
    </div>
  );
}
