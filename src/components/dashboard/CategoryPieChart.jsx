import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import GlassCard from '@/components/ui/GlassCard';

const COLORS = ['#60a5fa', '#4ade80', '#fb923c', '#a78bfa', '#f472b6', '#facc15'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg)',
        borderRadius: '14px',
        padding: '10px 14px',
        boxShadow: '6px 6px 16px rgba(163,177,198,0.6), -4px -4px 10px rgba(255,255,255,0.9)',
      }}>
        <p style={{ color: '#2d3d50', fontSize: '13px', fontWeight: 700 }}>{payload[0].name}</p>
        <p style={{ color: '#8a9ab0', fontSize: '11px' }}>
          {payload[0].payload.percentage?.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function CategoryPieChart({ title, subtitle, data, delay = 0 }) {
  const total = data?.reduce((acc, item) => acc + (item.value || 0), 0) || 0;
  const dataWithPercentage = data?.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0
  })) || [];

  return (
    <GlassCard className="h-[340px]" delay={delay}>
      <div className="mb-3">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p className="text-xs" style={{ color: '#8a9ab0' }}>{subtitle}</p>}
      </div>

      <div className="flex flex-col items-center h-[260px]">
        <div className="w-full h-[170px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentage}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {dataWithPercentage.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={0.85}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend — 2 columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full px-2 mt-1">
          {dataWithPercentage.slice(0, 6).map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: COLORS[index % COLORS.length] }} />
              <span className="text-xs truncate" style={{ color: '#6a7a8e' }}>{item.name}</span>
              <span className="text-xs font-bold ml-auto" style={{ color: '#4b5a6e' }}>{item.percentage?.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}