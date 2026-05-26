export default function MailPage() {
  return (
    <div className="mb-10">
      <h2 className="text-3xl font-bold text-slate-900">Mail (SOGO)</h2>
      <p className="text-slate-500 mt-1">Read and manage your enterprise emails.</p>
      
      <div className="mt-8 bg-white p-8 rounded-2xl border border-proton-card-border shadow-sm">
        <p className="text-slate-600">This module will integrate with the SOGO API / IMAP to fetch your inbox.</p>
      </div>
    </div>
  );
}
