export default function TasksPage() {
  return (
    <div className="mb-10">
      <h2 className="text-3xl font-bold text-slate-900">Tasks (Odoo)</h2>
      <p className="text-slate-500 mt-1">Manage your active projects and tasks.</p>
      
      <div className="mt-8 bg-white p-8 rounded-2xl border border-proton-card-border shadow-sm">
        <p className="text-slate-600">This module will interact with Odoo's XML-RPC API to manage project tasks.</p>
      </div>
    </div>
  );
}
