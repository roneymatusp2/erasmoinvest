import React from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar } from 'lucide-react';

interface FilterControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row gap-4 mb-6"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Filtrar por ticker..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
      </div>
    </motion.div>
  );
};

export default FilterControls;