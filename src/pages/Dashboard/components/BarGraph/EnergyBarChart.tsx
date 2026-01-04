
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
                    <Tooltip
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    />
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
                        barSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default EnergyBarChart;
