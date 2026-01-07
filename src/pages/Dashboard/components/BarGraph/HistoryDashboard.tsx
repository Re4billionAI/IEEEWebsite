import axios from 'axios';
import { useEffect, useState, useCallback } from 'react';
import EnergyBarChart from './EnergyBarChart';
import { ChevronLeft, ChevronRight, Calendar, IndianRupee, Leaf, Trees, Sun } from 'lucide-react';

// Styled Toggle Component
const Toggle = ({
    value,
    onChange,
    options
}: {
    value: string;
    onChange: (val: any) => void;
    options: string[]
}) => (
    <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
        {options.map((opt) => (
            <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 capitalize ${value === opt
                    ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                    }`}
            >
                {opt}
            </button>
        ))}
    </div>
);

export default function HistoryDashboard({ siteId }: { siteId: string }) {
    const [viewMode, setViewMode] = useState<'MONTH' | 'YEAR' | 'TOTAL'>('MONTH');
    const [metric, setMetric] = useState<'solar' | 'load'>('solar');

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const [summary, setSummary] = useState({ solar: 0, grid: 0, load: 0 });
    const [chartData, setChartData] = useState<any[]>([]);

    const changeYear = (delta: number) => {
        setYear(prev => {
            const next = prev + delta;
            const currentYear = new Date().getFullYear();
            // Limit range: 2022 to Current Year
            if (next < 2022) return 2022;
            if (next > currentYear) return currentYear;
            return next;
        });
    };

    const changeMonth = (delta: number) => {
        let nextMonth = month + delta;
        let nextYear = year;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        } else if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        }

        // Validate Year Range (2022 - Current)
        const currentYear = new Date().getFullYear();
        if (nextYear < 2022) {
            // Cap at Jan 2022
            nextMonth = 1;
            nextYear = 2022;
        } else if (nextYear > currentYear) {
            // Cap at Current Year
            // We should probably allow up to Dec of Current Year?
            // Or stop at current month? Usually standard UX stops at year boundary.
            nextYear = currentYear;
            // If wrapping pushed us to next year which is invalid, stay at 12
            if (delta > 0 && nextMonth === 1) nextMonth = 12; // Revert wrap
        }

        setMonth(nextMonth);
        if (nextYear !== year) {
            setYear(nextYear);
        }
    };

    const loadData = useCallback(async () => {
        try {
            if (viewMode === 'MONTH') {
                const res = await axios.post(`${process.env.REACT_APP_HOST}/admin/getDailyHistory`, { siteId, year, month });

                // Construct full month data
                const daysInMonth = new Date(year, month, 0).getDate();
                const fullData: any[] = [];
                const apiDataMap = new Map();

                let calculatedSolar = 0;
                let calculatedLoad = 0;
                let calculatedGrid = 0;

                if (res.data && res.data.days) {
                    res.data.days.forEach((d: any) => {
                        apiDataMap.set(d.date, d);
                        calculatedSolar += (d.solar || 0);
                        calculatedLoad += (d.load || 0);
                        calculatedGrid += (d.grid || 0);
                    });
                }

                for (let i = 1; i <= daysInMonth; i++) {
                    const dayStr = String(i).padStart(2, '0');
                    const monthStr = String(month).padStart(2, '0');
                    const dateStr = `${year}-${monthStr}-${dayStr}`;

                    const item = apiDataMap.get(dateStr);
                    const dateObj = new Date(year, month - 1, i);
                    const fullDateDisplay = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

                    if (item) {
                        fullData.push({
                            label: dayStr,
                            value: item[metric],
                            fullDate: fullDateDisplay
                        });
                    } else {
                        fullData.push({
                            label: dayStr,
                            value: null,
                            fullDate: fullDateDisplay
                        });
                    }
                }
                setChartData(fullData);

                // Set summary from calculated daily totals to ensure consistency
                setSummary({ solar: calculatedSolar, grid: calculatedGrid, load: calculatedLoad });
            }

            if (viewMode === 'YEAR') {
                // ... (Year logic unchanged) ...
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
                // ... (Total logic unchanged) ...
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

    // ... (useEffect and Picker States unchanged)

    useEffect(() => {
        loadData();
    }, [loadData]);

    const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    // Close one picker when opening the other
    const toggleYearPicker = () => {
        setIsYearPickerOpen(!isYearPickerOpen);
        if (!isYearPickerOpen) setIsMonthPickerOpen(false);
    };

    const toggleMonthPicker = () => {
        setIsMonthPickerOpen(!isMonthPickerOpen);
        if (!isMonthPickerOpen) setIsYearPickerOpen(false);
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const shortMonths = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // Generate years for picker: 2022 to Current Year
    const currentYear = new Date().getFullYear();
    const startYear = 2022;
    const years = Array.from({ length: (currentYear - startYear) + 1 }, (_, i) => startYear + i).reverse(); // Show latest first

    // Calculate Insights
    const totalSolar = summary?.solar || 0;
    const moneySaved = totalSolar * 8; // Assuming ₹8 per unit
    const co2Avoided = totalSolar * 0.85; // 0.85 kg CO2 per kWh
    const treesPlanted = co2Avoided / 20; // Approx 20kg CO2 per tree per year

    // Insight Card Component
    const InsightCard = ({ title, value, unit, icon: Icon, colorClass }: any) => (
        <div className="bg-white p-2 flex items-center gap-4">
            <div className={`p-3 rounded-full ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">
                    {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>
                </h3>
            </div>
        </div>
    );

    // ... (rest of returns)

    return (
        <div className="mt-5 mb-5 relative bg-white border border-gray-200 shadow-sm">
            {/* Top Header */}
            <div className='pl-5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-200'>
                <h1 className='text-2xl font-bold text-gray-800 py-4'>Historical Data</h1>

                {/* Control Bar inside Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
                    {/* ... Toggles ... */}
                    <div className="flex gap-4 w-full md:w-auto">
                        <Toggle
                            value={metric}
                            onChange={setMetric}
                            options={['solar', 'load']}
                        />
                    </div>

                    {/* Time Selection Group */}
                    <div className="flex items-center gap-4 bg-gray-50 p-2 border border-gray-200 w-full md:w-auto justify-center">

                        {/* Year Control */}
                        <div className="relative">
                            <div className="flex items-center bg-white shadow-sm border border-gray-100 px-1">
                                <button onClick={() => changeYear(-1)} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors">
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={toggleYearPicker}
                                    className={`font-bold text-gray-800 px-3 min-w-[60px] text-center transition-colors ${isYearPickerOpen ? 'text-emerald-600' : ''}`}
                                >
                                    {year}
                                </button>
                                <button onClick={() => changeYear(1)} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors">
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Year Picker Popover */}
                            {isYearPickerOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white p-3 shadow-xl border border-gray-100 w-48 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-3 gap-2">
                                        {years.map((y) => (
                                            <button
                                                key={y}
                                                onClick={() => {
                                                    setYear(y);
                                                    setIsYearPickerOpen(false);
                                                }}
                                                className={`py-2 px-1 rounded-lg text-xs font-bold transition-all ${year === y
                                                    ? 'bg-emerald-500 text-white shadow-md'
                                                    : 'bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                                                    }`}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode === 'MONTH' && (
                            <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>
                        )}

                        {/* Month Navigator */}
                        {viewMode === 'MONTH' && (
                            <div className="relative">
                                <div className="flex items-center bg-white shadow-sm border border-gray-100 px-1">
                                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={toggleMonthPicker}
                                        className={`font-bold text-gray-800 px-3 min-w-[90px] text-center transition-colors ${isMonthPickerOpen ? 'text-emerald-600' : ''}`}
                                    >
                                        {months[month - 1]}
                                    </button>
                                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                {/* Month Picker Popover */}
                                {isMonthPickerOpen && (
                                    <div className="absolute top-full right-0 mt-2 bg-white p-3 shadow-xl border border-gray-100 w-64 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-4 gap-2">
                                            {shortMonths.map((m, idx) => {
                                                const mNum = idx + 1;
                                                const isSelected = month === mNum;
                                                return (
                                                    <button
                                                        key={m}
                                                        onClick={() => {
                                                            setMonth(mNum);
                                                            setIsMonthPickerOpen(false);
                                                        }}
                                                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all ${isSelected
                                                            ? 'bg-emerald-500 text-white shadow-md'
                                                            : 'bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                                                            }`}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Insights Dashboard */}
            <div className="border-b border-gray-200 p-6 bg-gray-50/30">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    {viewMode === 'MONTH' ? `${months[month - 1]} Overview` : `${year} Overview`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <InsightCard
                        title="Total Generation"
                        value={totalSolar}
                        unit="kWh"
                        icon={Sun}
                        colorClass="bg-orange-100 text-orange-600"
                    />
                    <InsightCard
                        title="Estimated Savings"
                        value={moneySaved}
                        unit="INR"
                        icon={IndianRupee}
                        colorClass="bg-emerald-100 text-emerald-600"
                    />
                    <InsightCard
                        title="CO₂ Avoided"
                        value={co2Avoided}
                        unit="kg"
                        icon={Leaf}
                        colorClass="bg-blue-100 text-blue-600"
                    />
                    <InsightCard
                        title="Trees Equivalent"
                        value={treesPlanted}
                        unit="Trees"
                        icon={Trees}
                        colorClass="bg-green-100 text-green-600"
                    />
                </div>
            </div>

            {/* GRAPH */}
            <div className="p-4">
                <EnergyBarChart data={chartData} metric={metric} />
            </div>

            {/* Footer Note */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 italic flex items-center justify-center gap-1">
                <span className="font-semibold">* Estimates:</span>
                <span>Savings @ ₹8/kWh • CO₂ @ 0.85kg/kWh • Trees @ ~20kg CO₂/year</span>
            </div>

        </div>
    );
}
