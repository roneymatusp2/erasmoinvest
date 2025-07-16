import React from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2 mb-6 border-b border-slate-700">
      {tabs.map((tab) => (
        <motion.button
          key={tab}
          onClick={() => onTabChange(tab)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-6 py-3 rounded-lg whitespace-nowrap font-medium transition-all ${
            activeTab === tab
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {tab}
        </motion.button>
      ))}
    </div>
  );
};

export default Tabs;