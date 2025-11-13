'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: 'up' | 'down';
  subtitle?: string;
}

export function KpiCard({ title, value, change, icon, trend, subtitle }: KpiCardProps) {
  const isPositive = (change && change > 0) || trend === 'up';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted uppercase tracking-wide">{title}</p>
          <h3 className="text-3xl font-bold mt-2">{value}</h3>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-3 rounded-xl gradient-primary text-white">
            {icon}
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <ArrowUpIcon className="w-4 h-4 text-success" />
          ) : (
            <ArrowDownIcon className="w-4 h-4 text-error" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-error'}`}>
            {Math.abs(change)}%
          </span>
          <span className="text-sm text-muted ml-1">vs last period</span>
        </div>
      )}
    </motion.div>
  );
}
