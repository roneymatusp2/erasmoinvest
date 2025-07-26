import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
            expect(screen.getByText('Sistema Ultra-Avançado de Análise de Investimentos')).toBeInTheDocument();
        });
    });

    it('filters by asset type', async () => {
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(async () => {
            const acoesButton = screen.getByText('Só Ações');
            await userEvent.click(acoesButton);
            expect(screen.getByText('3 de 3 ativos sendo analisados (filtros ativos)')).toBeInTheDocument();
        });
    });

    it('filters by positive performance', async () => {
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(async () => {
            const lucroButton = screen.getByText('Só Lucro');
            await userEvent.click(lucroButton);
            expect(screen.getByText('2 de 3 ativos sendo analisados (filtros ativos)')).toBeInTheDocument();
        });
    });

    it('filters by negative performance', async () => {
        render(<ChartsTab portfolios={mockPortfolios} rawInvestments={[]} />);
        await waitFor(async () => {
            const prejuizoButton = screen.getByText('Só Prejuízo');
            await userEvent.click(prejuizoButton);
            expect(screen.getByText('1 de 3 ativos sendo analisados (filtros ativos)')).toBeInTheDocument();
        });
    });
});
