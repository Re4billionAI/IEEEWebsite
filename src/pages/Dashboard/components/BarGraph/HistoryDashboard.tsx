import axios from 'axios';
import { useEffect, useState, useCallback } from 'react';
import EnergyBarChart from './EnergyBarChart';

// Simple Card Component
const Card = ({ title, value }: { title: string; value: number }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
        <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>
        <p className="text-2xl font-bold text-gray-800">{value?.toLocaleString() || '0'} <span className="text-xs font-normal text-gray-400">kWh</span></p>
    </div>
);

// Toggle/Segmented Control Component
const Toggle = ({
    value,
    onChange,
    options
}: {
    value: string;
    onChange: (val: any) => void;
    options: string[]
}) => (
    <div className="flex bg-gray-100 p-1 rounded-lg">
        {options.map((opt) => (
            <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${value === opt
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
            >
                {opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase()}
            </button>
        ))}
    </div>
);

export default function HistoryDashboard({ siteId }: { siteId: string }) {
    const [viewMode, setViewMode] = useState<'MONTH' | 'YEAR' | 'TOTAL'>('MONTH');
    const [metric, setMetric] = useState<'solar' | 'grid' | 'load'>('solar');

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const [summary, setSummary] = useState({ solar: 0, grid: 0, load: 0 });
    const [chartData, setChartData] = useState<any[]>([]);

    const loadData = useCallback(async () => {
        try {
            if (viewMode === 'MONTH') {
                const res = await axios.post(`${process.env.REACT_APP_HOST}/admin/getDailyHistory`, { siteId, year, month });
                if (res.data && res.data.days) {
                    setChartData(
                        res.data.days.map((d: any) => ({
                            label: d.date.slice(8),
                            value: d[metric]
                        }))
                    );
                } else {
                    console.warn("No daily data returned");
                    setChartData([]);
                }

                // summary from monthly doc
                const m = await axios.post(`${process.env.REACT_APP_HOST}/admin/getMonthlyHistory`, { siteId, year });
                if (m.data && m.data.months) {
                    const monthDoc = m.data.months.find((x: any) => x.month.endsWith(String(month).padStart(2, '0')));
                    setSummary(monthDoc || { solar: 0, grid: 0, load: 0 });
                }
            }

            if (viewMode === 'YEAR') {
                const res = await axios.post(`${process.env.REACT_APP_HOST}/admin/getMonthlyHistory`, { siteId, year });
                if (res.data && res.data.months) {
                    setChartData(
                        res.data.months.map((m: any) => ({
                            label: m.month.slice(5),
                            value: m[metric]
                        }))
                    );
                } else {
                    setChartData([]);
                }

                const y = await axios.post(`${process.env.REACT_APP_HOST}/admin/getYearlySummary`, { siteId, year });
                if (y.data) {
                    setSummary(y.data);
                }
            }

            if (viewMode === 'TOTAL') {
                const res = await axios.post(`${process.env.REACT_APP_HOST}/admin/getYearlyHistory`, { siteId });
                if (res.data && res.data.years) {
                    setChartData(
                        res.data.years.map((y: any) => ({
                            label: y.year,
                            value: y[metric]
                        }))
                    );

                    // total summary
                    const total = res.data.years.reduce(
                        (acc: any, y: any) => ({
                            solar: acc.solar + y.solar,
                            grid: acc.grid + y.grid,
                            load: acc.load + y.load
                        }),
                        { solar: 0, grid: 0, load: 0 }
                    );
                    setSummary(total);
                }
            }
        } catch (error) {
            console.error("Error loading history data:", error);
        }
    }, [viewMode, metric, year, month, siteId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="space-y-0 mt-5 mb-5">
            {/* SUMMARY CARDS */}

            {/* CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4  shadow-sm">
                <div className="flex gap-2">
                    <Toggle
                        value={viewMode}
                        onChange={setViewMode}
                        options={['MONTH', 'YEAR', 'TOTAL']}
                    />
                    <Toggle
                        value={metric}
                        onChange={setMetric}
                        options={['solar', 'grid', 'load']}
                    />
                </div>

                {viewMode !== 'TOTAL' && (
                    <div className="flex gap-2">
                        <select
                            value={year}
                            onChange={e => setYear(+e.target.value)}
                            className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                        >
                            {[2023, 2024, 2025, new Date().getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {viewMode === 'MONTH' && (
                            <select
                                value={month}
                                onChange={e => setMonth(+e.target.value)}
                                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}
            </div>

            {/* GRAPH */}

            <EnergyBarChart data={chartData} metric={metric} />

        </div>
    );
}
