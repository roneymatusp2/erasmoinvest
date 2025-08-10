import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ChartsTab from '../ChartsTab';
import { usePortfolioStore } from '../../hooks/usePortfolioStore';

const mockPortfolios = [
    {
        ticker: 'AAPL',
        totalInvested: 1000,
        marketValue: 1200,
        profitPercent: 20,
        totalYield: 5,
        metadata: { nome: 'Apple Inc.', setor: 'Technology', tipo: 'Ação' },
    },
    {
        ticker: 'GOOGL',
        totalInvested: 1500,
        marketValue: 1800,
        profitPercent: 20,
        totalYield: 3,
        metadata: { nome: 'Alphabet Inc.', setor: 'Technology', tipo: 'Ação' },
    },
    {
        ticker: 'TSLA',
        totalInvested: 2000,
        marketValue: 1500,
        profitPercent: -25,
        totalYield: 0,
        metadata: { nome: 'Tesla, Inc.', setor: 'Automotive', tipo: 'Ação' },
    },
];

describe('ChartsTab', () => {
    beforeEach(() => {
        // Reset the store before each test
        act(() => {
            usePortfolioStore.setState({ filter: { assetTypes: [], specificAssets: [], metrics: ['rentabilidade'], comparison: 'none', showOnlyPositive: false, showOnlyNegative: false, minValue: 0, maxValue: Infinity } });
        });
    });

    it('renders without crashing', async () => {
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(() => {
            // Título atual do componente
            expect(screen.getByText('Análise Gráfica')).toBeInTheDocument();
        });
    });

    it('filters by asset type (store-driven)', async () => {
        // Aplicar filtro de tipo via store (evita depender do DOM avançado)
        act(() => {
            usePortfolioStore.setState((s) => ({
                filter: { ...s.filter, assetTypes: ['Ação'] }
            }));
        });
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(() => {
            const allThrees = screen.getAllByText(/\b3\b/);
            expect(allThrees.length).toBeGreaterThan(0);
        });
    });

    it('filters by positive performance (store-driven)', async () => {
        act(() => {
            usePortfolioStore.setState((s) => ({
                filter: { ...s.filter, showOnlyPositive: true, showOnlyNegative: false }
            }));
        });
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(() => {
            expect(screen.getByText(/\b2\b/)).toBeInTheDocument();
        });
    });

    it('filters by negative performance (store-driven)', async () => {
        act(() => {
            usePortfolioStore.setState((s) => ({
                filter: { ...s.filter, showOnlyPositive: false, showOnlyNegative: true }
            }));
        });
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(() => {
            expect(screen.getByText(/\b1\b/)).toBeInTheDocument();
        });
    });
});
