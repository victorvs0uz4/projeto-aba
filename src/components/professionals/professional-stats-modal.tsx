'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, BarChart3, CheckCircle, XCircle, Clock, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsData {
  professionalName: string;
  total: number;
  done: number;
  cancelled: number;
  scheduled: number;
  rescheduled: number;
  doneRate: number;
  cancelRate: number;
}

interface PeriodOption {
  label: string;
  start: Date;
  end: Date;
}

function getPeriods(): Record<string, PeriodOption> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return {
    week: { label: 'Esta semana', start: startOfWeek, end: now },
    month: { label: 'Este mês', start: startOfMonth, end: now },
    quarter: { label: 'Últimos 3 meses', start: start3Months, end: now },
    year: { label: 'Este ano', start: startOfYear, end: now },
    all: { label: 'Todo o período', start: new Date('2000-01-01'), end: now },
  };
}

interface Props {
  professionalId: string;
  professionalName: string;
  onClose: () => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  percentage,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  percentage?: number;
}) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-surface-muted mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {percentage !== undefined && (
          <div className="mt-1.5">
            <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${percentage}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color }}>{percentage}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfessionalStatsModal({ professionalId, professionalName, onClose }: Props) {
  const periods = getPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const period = periods[selectedPeriod];
    setLoading(true);
    setError(null);
    fetch(
      `/api/professionals/${professionalId}/stats?start=${period.start.toISOString()}&end=${period.end.toISOString()}`
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? `Erro ${r.status}`);
          setStats(null);
        } else {
          setStats(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Stats fetch error:', err);
        setError('Erro de conexão ao carregar estatísticas.');
        setStats(null);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId, selectedPeriod]);

  return (
    <>
      <div className="dialog-overlay" onClick={onClose} />
      <div className="dialog-content" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-teal-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Estatísticas de Sessões</h2>
              <p className="text-sm text-surface-muted">{professionalName}</p>
            </div>
          </div>
          <button className="btn-ghost p-1.5 rounded-lg" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(periods).map(([key, period]) => (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                selectedPeriod === key
                  ? 'bg-brand-600/20 text-brand-300 border-brand-700/50'
                  : 'bg-surface border-surface-border text-surface-muted hover:text-white'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          </div>
        ) : stats ? (
          <>
            {stats.total === 0 ? (
              <div className="text-center py-10 text-surface-muted">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma sessão no período selecionado.</p>
              </div>
            ) : (
              <>
                {/* Total highlight */}
                <div className="rounded-xl bg-gradient-to-br from-brand-600/15 to-teal-600/15 border border-brand-700/30 p-5 mb-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-brand-300 uppercase tracking-wider font-medium mb-1">Total de Sessões</p>
                    <p className="text-4xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-surface-muted mt-1">{periods[selectedPeriod].label}</p>
                  </div>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-1 h-16">
                    {[
                      { val: stats.done, color: '#22c55e' },
                      { val: stats.scheduled, color: '#0ea5e9' },
                      { val: stats.rescheduled, color: '#f97316' },
                      { val: stats.cancelled, color: '#ef4444' },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className="w-6 rounded-t-sm transition-all duration-700"
                        style={{
                          height: `${stats.total > 0 ? Math.max(4, (bar.val / stats.total) * 100) : 4}%`,
                          backgroundColor: bar.color,
                          opacity: bar.val === 0 ? 0.2 : 1,
                        }}
                        title={`${bar.val}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Stat cards 2x2 */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={CheckCircle}
                    label="Realizadas"
                    value={stats.done}
                    color="#22c55e"
                    percentage={stats.doneRate}
                  />
                  <StatCard
                    icon={XCircle}
                    label="Canceladas"
                    value={stats.cancelled}
                    color="#ef4444"
                    percentage={stats.cancelRate}
                  />
                  <StatCard
                    icon={Clock}
                    label="Agendadas"
                    value={stats.scheduled}
                    color="#0ea5e9"
                  />
                  <StatCard
                    icon={RefreshCw}
                    label="Remarcadas"
                    value={stats.rescheduled}
                    color="#f97316"
                  />
                </div>

                {/* Summary text */}
                <div className="mt-4 p-3 rounded-lg bg-surface border border-surface-border text-xs text-surface-muted flex items-center gap-2">
                  {stats.cancelRate > 30 ? (
                    <><TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" /> Taxa de cancelamento elevada ({stats.cancelRate}%). Considere verificar os motivos com o profissional.</>
                  ) : stats.doneRate >= 70 ? (
                    <><TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" /> Excelente taxa de realização ({stats.doneRate}%)! Desempenho acima da média.</>
                  ) : (
                    <><BarChart3 className="w-4 h-4 text-brand-400 flex-shrink-0" /> {stats.doneRate}% das sessões foram realizadas no período selecionado.</>
                  )}
                </div>
              </>
            )}
          </>
        ) : error ? (
          <p className="text-center text-red-400 py-8 text-sm">{error}</p>
        ) : (
          <p className="text-center text-red-400 py-8 text-sm">Erro ao carregar estatísticas.</p>
        )}
      </div>
    </>
  );
}
