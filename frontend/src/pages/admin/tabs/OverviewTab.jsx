import { CreditCard, FileText, Users, Wallet } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Grid from '../../../components/ui/Grid';

/**
 * OverviewTab - Summary statistics and key metrics
 */
export default function OverviewTab({ stats, pipelineRequests, pendingPaymentsList, overview }) {
  return (
    <div className="space-y-6">
      <Grid cols="4" gap="5">
        <Card variant="default">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-2">Total Registered Users</p>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalUsers ?? 0}</h2>
            </div>
            <div className="rounded-2xl border border-blue-100 dark:border-blue-900/30 p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <Users size={18} />
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-2">Pending Payments</p>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{pendingPaymentsList.length || stats.pendingPayments || 0}</h2>
            </div>
            <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <CreditCard size={18} />
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-2">Pending Approvals</p>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{pipelineRequests.length || 0}</h2>
            </div>
            <div className="rounded-2xl border border-violet-100 dark:border-violet-900/30 p-2.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
              <FileText size={18} />
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase mb-2">Aggregated Liability</p>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">₦{stats.totalBalance || 0}</h2>
            </div>
            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <Wallet size={18} />
            </div>
          </div>
        </Card>
      </Grid>

      <Card variant="default">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">System Status</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Verification System</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-semibold text-green-600 dark:text-green-400">Online</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Payment Gateway</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-semibold text-green-600 dark:text-green-400">Online</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Database</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-semibold text-green-600 dark:text-green-400">Online</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
