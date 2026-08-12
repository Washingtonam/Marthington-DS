import { CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../../../../components/ui/Card';

/**
 * PaymentsTab - Displays pending and recent payments
 */
export default function PaymentsTab({ pendingPaymentsList, loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card variant="default">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Pending Payments</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {pendingPaymentsList.length} payment{pendingPaymentsList.length !== 1 ? 's' : ''} awaiting processing
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/payments')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View all →
          </button>
        </div>

        {pendingPaymentsList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No pending payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPaymentsList.map((payment) => (
              <motion.div
                key={payment._id}
                whileHover={{ x: 6 }}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => navigate('/admin/payments')}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    <CreditCard size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {payment.userEmail || (payment.userId?.email) || 'Unknown User'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Awaiting approval
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-slate-100">₦{Number(payment.amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
