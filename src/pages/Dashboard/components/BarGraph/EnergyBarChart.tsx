
import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface EnergyBarChartProps {
    data: any[];
    metric: 'solar' | 'grid' | 'load';
}

const EnergyBarChart: React.FC<EnergyBarChartProps> = ({ data, metric }) => {

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                    <p className="text-gray-500 text-xs mb-1">{dataPoint.fullDate || `Day ${label}`}</p>
                    <p className="text-gray-800 font-bold text-sm">
                        {payload[0].value !== null && payload[0].value !== undefined
                            ? `${Number(payload[0].value).toFixed(2)} kWh`
                            : 'N/A'}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[500px] bg-white p-4  shadow-sm border border-gray-100 mt-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        tick={{ fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                    <Legend />
                    <Bar
                        dataKey="value"
                        name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                        fill={
                            metric === 'solar' ? '#10b981' :
                                metric === 'grid' ? '#3b82f6' :
                                    '#f59e0b'
                        }
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default EnergyBarChart;
