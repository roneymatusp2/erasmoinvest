import React from 'react';
import { motion } from 'framer-motion';
import AdvancedDashboard from './AdvancedDashboard';
import PortfolioSummary from './PortfolioSummary';
import { Portfolio } from '../types/investment';

interface DashboardTabProps {
  portfolios: Portfolio[];
}

const DashboardTab: React.FC<DashboardTabProps> = ({ portfolios }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* 🎯 HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-4">
          Dashboard Avançado
        </h1>
        <p className="text-slate-400 text-lg">
          Análises detalhadas e gráficos interativos do seu portfólio
        </p>
      </div>

      {/* 📊 Advanced Dashboard */}
      <AdvancedDashboard portfolios={portfolios} />
      
      {/* 📋 Portfolio Summary */}
      <PortfolioSummary portfolios={portfolios} />
    </motion.div>
  );
};

export default DashboardTab; 