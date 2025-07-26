import { create } from 'zustand';

interface ChartFilter {
    assetTypes: string[];
    specificAssets: string[];
    metrics: string[];
    comparison: 'none' | 'benchmark' | 'peer' | 'sector';
    showOnlyPositive: boolean;
    showOnlyNegative: boolean;
    minValue: number;
    maxValue: number;
}

interface FilterState {
    filter: ChartFilter;
    setFilter: (filter: Partial<ChartFilter>) => void;
}

export const usePortfolioStore = create<FilterState>((set) => ({
    filter: {
        assetTypes: [],
        specificAssets: [],
        metrics: ['rentabilidade'],
        comparison: 'none',
        showOnlyPositive: false,
        showOnlyNegative: false,
        minValue: 0,
        maxValue: Infinity,
    },
    setFilter: (newFilter) => set((state) => ({ filter: { ...state.filter, ...newFilter } })),
}));
