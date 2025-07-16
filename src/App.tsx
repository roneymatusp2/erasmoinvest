import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Plus, 
  Download, 
  FileDown, 
  RefreshCw, 
  Table, 
  BarChart3, 
  LayoutGrid,
  ListOrdered,
  Search,
  Calendar
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import toast from 'react-hot-toast';
import Login from './components/Login';

// Dados locais como fallback
import { portfolioData } from './data/portfolioData';
import { assetMetadata } from './data/assetMetadata';

// Serviços do Supabase
import { portfolioService, AssetMetadata as SupabaseAssetMetadata } from './services/supabaseService';
// import { updatePortfoliosWithMarketData, PortfolioWithMarketData } from './services/portfolioCalculator';

// Estilos e componentes
import './index.css';
import Header from './components/Header';
import InvestmentTable from './components/InvestmentTable';
import AdvancedDashboard from './components/AdvancedDashboard';
import AssetCard from './components/AssetCard';
import Summary from './components/Summary';
import AddInvestmentModal from './components/AddInvestmentModal';
import EditInvestmentModal from './components/EditInvestmentModal';
import NewAssetModal from './components/NewAssetModal';
import PortfolioSummary from './components/PortfolioSummary';
// 🚀 NOVOS COMPONENTES INCRÍVEIS PARA AS ABAS PRINCIPAIS
import OverviewTab from './components/OverviewTab';
import DashboardTab from './components/DashboardTab';
import PortfolioTab from './components/PortfolioTab';
import SettingsTab from './components/SettingsTab';
import { Portfolio } from './types/investment';

function App() {
  // Debug das variáveis de ambiente
  console.log('🔧 ERASMO INVEST - Configurações:');
  console.log('🌐 SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'NÃO DEFINIDA');
  console.log('🔑 SUPABASE_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
  console.log('🔒 Auth Estado:', localStorage.getItem('erasmoInvestAuth'));

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem('erasmoInvestAuth') === 'true'
  );
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0); 
  const [viewMode, setViewMode] = useState<'table' | 'dashboard' | 'all'>('table');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [showHorizontal, setShowHorizontal] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [useLocalData, setUseLocalData] = useState<boolean>(true); // FORÇAR DADOS LOCAIS
  
  // Estados dos modais
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showNewAssetModal, setShowNewAssetModal] = useState<boolean>(false);
  const [editingInvestment, setEditingInvestment] = useState<unknown>(null);
  
  // Carregar dados (Supabase ou locais)
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      console.log('🚀 ERASMO INVEST - Iniciando carregamento de dados...');
      console.log('📊 Portfolio Service:', portfolioService ? 'DISPONÍVEL' : 'INDISPONÍVEL');
      console.log('🔧 Use Local Data:', useLocalData);
      
      setLoading(true);
      
      // DESABILITADO: Tentar carregar do Supabase primeiro
      if (false && portfolioService && !useLocalData) {
        try {
          console.log('🔄 === FORÇANDO NOVA CARGA SUPABASE ===');
          
          // Limpar cache anterior
          localStorage.removeItem('portfolioCache');
          localStorage.removeItem('marketCache');
          
          const portfolioData = await portfolioService.getPortfolioSummary();
          console.log('✅ Dados carregados do Supabase:', portfolioData?.length || 0, 'ativos');
          
          if (portfolioData && portfolioData.length > 0) {
            console.log('📋 Lista de tickers carregados:', portfolioData.map(p => p.ticker).join(', '));
            console.log('💰 Total de investimentos únicos:', portfolioData.length);
            
            // Verificar se BBAS3 está presente
            const bbas3 = portfolioData.find(p => p.ticker === 'BBAS3');
            if (bbas3) {
              console.log('✅ BBAS3 encontrado - Posição:', bbas3.currentPosition, 'ações');
            } else {
              console.log('❌ BBAS3 NÃO encontrado na lista');
            }
            
            // Mostrar alguns exemplos de ativos
            const top5 = portfolioData.slice(0, 5).map(p => `${p.ticker}(${p.currentPosition})`);
            console.log('📊 Primeiros 5 ativos:', top5.join(', '));
          }
          
          setPortfolios(portfolioData);
          
          if (!activeTab && portfolioData.length > 0) {
            setActiveTab('overview'); // 🚀 Começar na aba Overview
            console.log('📈 Aba ativa definida: overview');
          }
          
          setLoading(false);
          console.log('🎉 Carregamento concluído com sucesso!');
          return;
        } catch (error) {
          console.error('❌ ERRO NO SUPABASE:', error);
          console.log('🔄 Fallback para dados locais...');
          setUseLocalData(true);
        }
      }
      
      // Fallback para dados locais
      const localPortfolios = Object.keys(portfolioData).sort().map(ticker => {
        const data = portfolioData[ticker];
        const metadata = assetMetadata[ticker];
        
        let totalInvested = 0;
        let totalDividends = 0;
        let totalJuros = 0;
        let totalImpostos = 0;
        let currentPosition = 0;
        
        data.forEach(row => {
          const valorTotal = (row.compra - row.venda) * row.valorUnit;
          totalInvested += valorTotal;
          totalDividends += row.dividendos || 0;
          totalJuros += row.juros || 0;
          totalImpostos += row.impostos || 0;
          currentPosition += (row.compra - row.venda);
        });
        
        const totalProventos = totalDividends + totalJuros;
        const totalYield = totalInvested > 0 ? ((totalProventos) / Math.abs(totalInvested)) * 100 : 0;
        
        const averagePrice = currentPosition > 0 ? Math.abs(totalInvested) / currentPosition : 0;
        const marketFactor = 1 + ((Math.random() - 0.3) * 0.2);
        const marketValue = currentPosition * averagePrice * marketFactor;
        
        const profit = marketValue - Math.abs(totalInvested);
        const profitPercent = totalInvested !== 0 ? (profit / Math.abs(totalInvested)) * 100 : 0;
        
        return {
          ticker,
          metadata,
          totalInvested: Math.abs(totalInvested),
          totalDividends,
          totalJuros,
          totalImpostos,
          currentPosition,
          totalYield: isNaN(totalYield) ? 0 : totalYield,
          marketValue,
          profit,
          profitPercent: isNaN(profitPercent) ? 0 : profitPercent,
          investments: data.map(row => ({
            data: row.data,
            tipo: (row.compra > 0 ? 'COMPRA' : row.venda > 0 ? 'VENDA' : 'DIVIDENDO') as 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JUROS' | 'DESDOBRAMENTO',
            compra: row.compra,
            venda: row.venda,
            quantidade: row.compra || row.venda || 0,
            valorUnit: row.valorUnit || 0,
            valor_unitario: row.valorUnit || 0,
            valor_total: (row.compra - row.venda) * row.valorUnit,
            dividendos: row.dividendos || 0,
            juros: row.juros || 0,
            impostos: row.impostos || 0,
            obs: row.obs || '',
            observacoes: row.obs || ''
          }))
        };
      });
      
      setPortfolios(localPortfolios);
      
      if (!activeTab && localPortfolios.length > 0) {
        setActiveTab(localPortfolios[0].ticker);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
      setLoading(false);
    }
  };

  const sortedInvestments = useMemo(() => {
    return portfolios.map(p => p.ticker).sort((a, b) => a.localeCompare(b));
  }, [portfolios]);

  const filteredTabs = useMemo(() => {
    return sortedInvestments.filter(ticker => 
      ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, sortedInvestments]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedAsset(null);
  };

  const handleDataChange = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Dados atualizados!');
  };
  
  const handleEditInvestment = (investment: unknown) => {
    setEditingInvestment(investment);
    setShowEditModal(true);
  };
  
  const handleModalSuccess = () => {
    handleDataChange();
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingInvestment(null);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');

    // ===========================================
    // ABA 1: PAINEL EXECUTIVO
    // ===========================================
    const dashboardData = [
      ['ERASMO INVEST - PAINEL EXECUTIVO', '', '', '', '', '', ''],
      [`Relatório gerado em: ${currentDate} às ${currentTime}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['RESUMO CONSOLIDADO', '', '', '', '', '', ''],
      ['Total de Ativos:', portfolios.length, '', 'Total Investido:', `R$ ${portfolios.reduce((sum, p) => sum + p.totalInvested, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', ''],
      ['Valor de Mercado:', `R$ ${portfolios.reduce((sum, p) => sum + p.marketValue, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', 'Total Dividendos:', `R$ ${portfolios.reduce((sum, p) => sum + p.totalDividends, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', ''],
      ['Rentabilidade Total:', `${portfolios.length > 0 ? (portfolios.reduce((sum, p) => sum + p.profit, 0) / portfolios.reduce((sum, p) => sum + p.totalInvested, 0) * 100).toFixed(2) : 0}%`, '', 'Total Juros:', `R$ ${portfolios.reduce((sum, p) => sum + p.totalJuros, 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', ''],
      ['', '', '', '', '', '', ''],
      ['PERFORMANCE POR CATEGORIA', '', '', '', '', '', ''],
      ['Categoria', 'Qtd Ativos', 'Valor Investido', 'Valor Atual', 'Dividendos', 'Rentabilidade', 'Percentual']
    ];

    // Agrupar por tipo
    const groupedByType = portfolios.reduce((acc, p) => {
      const tipo = p.metadata?.tipo || 'Outros';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(p);
      return acc;
    }, {} as Record<string, typeof portfolios>);

    Object.entries(groupedByType).forEach(([tipo, portfolioList]) => {
      const totalInvested = portfolioList.reduce((sum, p) => sum + p.totalInvested, 0);
      const totalMarket = portfolioList.reduce((sum, p) => sum + p.marketValue, 0);
      const totalDividends = portfolioList.reduce((sum, p) => sum + p.totalDividends, 0);
      const performance = totalInvested > 0 ? ((totalMarket - totalInvested) / totalInvested * 100) : 0;
      const percentage = portfolios.reduce((sum, p) => sum + p.totalInvested, 0) > 0 ? 
        (totalInvested / portfolios.reduce((sum, p) => sum + p.totalInvested, 0) * 100) : 0;

      dashboardData.push([
        tipo,
        portfolioList.length,
        `R$ ${totalInvested.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${totalMarket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `${performance.toFixed(2)}%`,
        `${percentage.toFixed(1)}%`
      ]);
    });

    const dashboardWS = XLSX.utils.aoa_to_sheet(dashboardData);
    
    // Formatação do cabeçalho
    const range = XLSX.utils.decode_range(dashboardWS['!ref']!);
    dashboardWS['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(workbook, dashboardWS, '📊 Painel Executivo');

    // ===========================================
    // ABA 2: RESUMO DETALHADO
    // ===========================================
    const summaryData = [
      ['ERASMO INVEST - RESUMO DETALHADO POR ATIVO', '', '', '', '', '', '', '', '', '', '', ''],
      [`Atualizado em: ${currentDate} às ${currentTime}`, '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', ''],
      ['Ticker', 'Nome do Ativo', 'Tipo', 'País', 'Setor', 'Posição Atual', 'Valor Investido', 'Valor de Mercado', 'Dividendos', 'Juros', 'DY Total (%)', 'Rentabilidade (%)']
    ];
    
    portfolios.forEach(p => {
      summaryData.push([
        p.ticker,
        p.metadata?.nome || p.ticker,
        p.metadata?.tipo || 'N/A',
        p.metadata?.pais || 'BRASIL',
        p.metadata?.setor || 'N/A',
        p.currentPosition.toLocaleString('pt-BR', {minimumFractionDigits: 0}),
        `R$ ${p.totalInvested.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${p.marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${p.totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${p.totalJuros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `${p.totalYield.toFixed(2)}%`,
        `${p.profitPercent.toFixed(2)}%`
      ]);
    });

    // Linha de totais
    const totalInvested = portfolios.reduce((sum, p) => sum + p.totalInvested, 0);
    const totalMarket = portfolios.reduce((sum, p) => sum + p.marketValue, 0);
    const totalDividends = portfolios.reduce((sum, p) => sum + p.totalDividends, 0);
    const totalJuros = portfolios.reduce((sum, p) => sum + p.totalJuros, 0);
    const avgYield = totalInvested > 0 ? ((totalDividends + totalJuros) / totalInvested * 100) : 0;
    const totalProfit = totalInvested > 0 ? ((totalMarket - totalInvested) / totalInvested * 100) : 0;

    summaryData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
    summaryData.push([
      'TOTAIS', '', '', '', '',
      portfolios.reduce((sum, p) => sum + p.currentPosition, 0).toLocaleString('pt-BR'),
      `R$ ${totalInvested.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `R$ ${totalMarket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `R$ ${totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `R$ ${totalJuros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `${avgYield.toFixed(2)}%`,
      `${totalProfit.toFixed(2)}%`
    ]);

    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWS['!cols'] = [
      { wch: 10 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 20 }, 
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, summaryWS, '📋 Resumo Detalhado');

    // ===========================================
    // ABAS INDIVIDUAIS POR ATIVO
    // ===========================================
    portfolios.forEach(portfolio => {
      const data = portfolio.investments;
      if (!data || data.length === 0) return;

      const assetData = [
        [`${portfolio.metadata?.nome || portfolio.ticker} (${portfolio.ticker})`, '', '', '', '', '', '', '', '', '', ''],
        [`Tipo: ${portfolio.metadata?.tipo || 'N/A'} | Setor: ${portfolio.metadata?.setor || 'N/A'} | País: ${portfolio.metadata?.pais || 'BRASIL'}`, '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['INFORMAÇÕES GERAIS', '', '', '', '', '', '', '', '', '', ''],
        ['Posição Atual:', `${portfolio.currentPosition.toLocaleString('pt-BR')} cotas`, '', 'Total Investido:', `R$ ${portfolio.totalInvested.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', '', '', '', '', ''],
        ['Valor de Mercado:', `R$ ${portfolio.marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', 'Preço Médio:', `R$ ${portfolio.currentPosition > 0 ? (Math.abs(portfolio.totalInvested) / portfolio.currentPosition).toFixed(4) : '0.00'}`, '', '', '', '', '', ''],
        ['Total Dividendos:', `R$ ${portfolio.totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', 'Total Juros:', `R$ ${portfolio.totalJuros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', '', '', '', '', '', ''],
        ['DY Total:', `${portfolio.totalYield.toFixed(2)}%`, '', 'Rentabilidade:', `${portfolio.profitPercent.toFixed(2)}%`, '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['HISTÓRICO DE OPERAÇÕES', '', '', '', '', '', '', '', '', '', ''],
        ['Data', 'Tipo', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Dividendos', 'Juros', 'Impostos', 'DY Operação (%)', 'Posição Acum.', 'Observações']
      ];

      let posicaoAcumulada = 0;
      let investimentoAcumulado = 0;

      data.forEach((row, index) => {
        const formattedDate = new Date(row.data).toLocaleDateString('pt-BR');
        
        let quantidade = 0;
        let valorTotal = 0;
        
        if (row.tipo === 'COMPRA') {
          quantidade = row.quantidade;
          valorTotal = row.valor_total;
          posicaoAcumulada += quantidade;
          investimentoAcumulado += valorTotal;
        } else if (row.tipo === 'VENDA') {
          quantidade = -row.quantidade;
          valorTotal = -row.valor_total;
          posicaoAcumulada += quantidade;
          investimentoAcumulado += valorTotal;
        }

        // Calcular DY da operação
        const dyOperacao = row.dividendos > 0 && Math.abs(valorTotal) > 0 ? 
          (row.dividendos / Math.abs(valorTotal) * 100) : 0;

        assetData.push([
          formattedDate,
          row.tipo,
          quantidade !== 0 ? Math.abs(quantidade).toLocaleString('pt-BR') : '',
          row.valor_unitario > 0 ? `R$ ${row.valor_unitario.toLocaleString('pt-BR', {minimumFractionDigits: 4})}` : '',
          valorTotal !== 0 ? `R$ ${Math.abs(valorTotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
          row.dividendos > 0 ? `R$ ${row.dividendos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
          row.juros > 0 ? `R$ ${row.juros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
          row.impostos > 0 ? `R$ ${row.impostos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
          dyOperacao > 0 ? `${dyOperacao.toFixed(2)}%` : '',
          posicaoAcumulada.toLocaleString('pt-BR'),
          row.observacoes || ''
        ]);
      });

      // Linha de totais para o ativo
      assetData.push(['', '', '', '', '', '', '', '', '', '', '']);
      assetData.push([
        'TOTAIS',
        '',
        `${portfolio.currentPosition.toLocaleString('pt-BR')} cotas`,
        `Preço Médio: R$ ${portfolio.currentPosition > 0 ? (Math.abs(portfolio.totalInvested) / portfolio.currentPosition).toFixed(4) : '0.0000'}`,
        `R$ ${Math.abs(portfolio.totalInvested).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${portfolio.totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${portfolio.totalJuros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `R$ ${(portfolio.totalImpostos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        `DY: ${portfolio.totalYield.toFixed(2)}%`,
        `Rentab: ${portfolio.profitPercent.toFixed(2)}%`,
        `Valor Atual: R$ ${portfolio.marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
      ]);

      const ws = XLSX.utils.aoa_to_sheet(assetData);
      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, 
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(workbook, ws, portfolio.ticker);
    });

    // Salvar arquivo
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Erasmo_Invest_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('📊 Planilha Excel profissional exportada com sucesso!');
  };

  const exportSingleAsset = () => {
    const portfolio = portfolios.find(p => p.ticker === activeTab);
    const data = portfolio?.investments;
    if (!data?.length) {
      toast.error('Não há dados para exportar');
      return;
    }

    // Criar workbook Excel para ativo individual
    const workbook = XLSX.utils.book_new();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');

    const assetData = [
      [`ERASMO INVEST - ${portfolio.metadata?.nome || activeTab} (${activeTab})`, '', '', '', '', '', '', '', '', ''],
      [`Relatório gerado em: ${currentDate} às ${currentTime}`, '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['═══════════════════════════════════════════════════════════════════════', '', '', '', '', '', '', '', '', ''],
      ['INFORMAÇÕES GERAIS DO ATIVO', '', '', '', '', '', '', '', '', ''],
      ['═══════════════════════════════════════════════════════════════════════', '', '', '', '', '', '', '', '', ''],
      ['Tipo:', portfolio.metadata?.tipo || 'N/A', '', 'Setor:', portfolio.metadata?.setor || 'N/A', '', '', '', '', ''],
      ['País:', portfolio.metadata?.pais || 'BRASIL', '', 'Moeda:', portfolio.metadata?.moeda || 'BRL', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['RESUMO FINANCEIRO', '', '', '', '', '', '', '', '', ''],
      ['─────────────────────────────────────────────────────────────────────', '', '', '', '', '', '', '', '', ''],
      ['Posição Atual:', `${portfolio.currentPosition.toLocaleString('pt-BR')} cotas`, '', 'Preço Médio de Compra:', `R$ ${portfolio.currentPosition > 0 ? (Math.abs(portfolio.totalInvested) / portfolio.currentPosition).toFixed(4) : '0.0000'}`, '', '', '', '', ''],
      ['Total Investido:', `R$ ${portfolio.totalInvested.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', 'Valor de Mercado:', `R$ ${portfolio.marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', '', '', '', ''],
      ['Total Dividendos:', `R$ ${portfolio.totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', 'Total Juros:', `R$ ${portfolio.totalJuros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', '', '', '', ''],
      ['DY Total:', `${portfolio.totalYield.toFixed(2)}%`, '', 'Rentabilidade:', `${portfolio.profitPercent.toFixed(2)}%`, '', '', '', '', ''],
      ['Lucro/Prejuízo:', `R$ ${portfolio.profit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', 'Impostos Pagos:', `R$ ${(portfolio.totalImpostos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['═══════════════════════════════════════════════════════════════════════', '', '', '', '', '', '', '', '', ''],
      ['HISTÓRICO COMPLETO DE OPERAÇÕES', '', '', '', '', '', '', '', '', ''],
      ['═══════════════════════════════════════════════════════════════════════', '', '', '', '', '', '', '', '', ''],
      ['Data', 'Tipo', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Dividendos', 'Juros', 'Impostos', 'DY da Operação (%)', 'Posição Acumulada', 'Observações']
    ];

    let posicaoAcumulada = 0;
    let investimentoAcumulado = 0;

    data.forEach((row: any, index: number) => {
      const formattedDate = new Date(row.data).toLocaleDateString('pt-BR');
      
      let quantidade = 0;
      let valorTotal = 0;
      
      if (row.tipo === 'COMPRA') {
        quantidade = row.quantidade;
        valorTotal = row.valor_total;
        posicaoAcumulada += quantidade;
        investimentoAcumulado += valorTotal;
      } else if (row.tipo === 'VENDA') {
        quantidade = row.quantidade;
        valorTotal = row.valor_total;
        posicaoAcumulada -= quantidade;
        investimentoAcumulado -= valorTotal;
      }

      // Calcular DY da operação
      const dyOperacao = row.dividendos > 0 && Math.abs(valorTotal) > 0 ? 
        (row.dividendos / Math.abs(valorTotal) * 100) : 0;

      assetData.push([
        formattedDate,
        row.tipo,
        quantidade > 0 ? quantidade.toLocaleString('pt-BR') : '',
        row.valor_unitario > 0 ? `R$ ${row.valor_unitario.toLocaleString('pt-BR', {minimumFractionDigits: 4})}` : '',
        valorTotal > 0 ? `R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
        row.dividendos > 0 ? `R$ ${row.dividendos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
        row.juros > 0 ? `R$ ${row.juros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
        row.impostos > 0 ? `R$ ${row.impostos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '',
        dyOperacao > 0 ? `${dyOperacao.toFixed(2)}%` : '',
        posicaoAcumulada.toLocaleString('pt-BR'),
        row.observacoes || ''
      ]);
    });

    // Linha separadora e totals
    assetData.push(['─────────────────────────────────────────────────────────────────────', '', '', '', '', '', '', '', '', '', '']);
    assetData.push([
      'TOTAIS',
      `${data.length} operações`,
      `${portfolio.currentPosition.toLocaleString('pt-BR')} cotas`,
      `Preço Médio: R$ ${portfolio.currentPosition > 0 ? (Math.abs(portfolio.totalInvested) / portfolio.currentPosition).toFixed(4) : '0.0000'}`,
      `R$ ${Math.abs(portfolio.totalInvested).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `R$ ${portfolio.totalDividends.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `R$ ${portfolio.totalJuros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `R$ ${(portfolio.totalImpostos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
      `DY Total: ${portfolio.totalYield.toFixed(2)}%`,
      `Rentabilidade: ${portfolio.profitPercent.toFixed(2)}%`,
      `Valor Atual: R$ ${portfolio.marketValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(assetData);
    
    // Configurar larguras das colunas
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, 
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 35 }
    ];

    XLSX.utils.book_append_sheet(workbook, ws, activeTab);

    // Salvar arquivo
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Erasmo_Invest_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success(`📊 Relatório detalhado de ${activeTab} exportado!`);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('erasmoInvestAuth');
    setIsAuthenticated(false);
    toast.success('Você saiu do sistema com sucesso');
  };

  // PRIMEIRA VERIFICAÇÃO: Se não está autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // SEGUNDA VERIFICAÇÃO: Se autenticado mas carregando dados, mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Carregando dados...</p>
          {useLocalData && <p className="text-sm text-slate-400 mt-2">Usando dados locais</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <Toaster 
        position="top-center"
        toastOptions={{ 
          duration: 3000,
          style: {
            background: '#1e293b',
            color: 'white',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      />
      <SonnerToaster 
        position="top-center"
        theme="dark"
      />
      
              <Header currentTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">


        {/* Abas */}
        <div className={`bg-slate-800/40 backdrop-blur-sm rounded-lg border border-slate-700/50 p-2 mb-6 ${showHorizontal ? 'overflow-x-auto' : ''}`}>
          {showHorizontal ? (
            <div className="flex gap-2 pb-1" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {filteredTabs.map((tab) => {
                const isUSAsset = ['VOO', 'VNQ', 'DVN', 'EVEX', 'O'].includes(tab);
                
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-2 px-4 rounded whitespace-nowrap transition-colors ${
                      activeTab === tab 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : isUSAsset 
                          ? 'bg-indigo-700/50 text-indigo-200 hover:bg-indigo-600'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredTabs.map((tab) => {
                const isUSAsset = ['VOO', 'VNQ', 'DVN', 'EVEX', 'O'].includes(tab);
                
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`py-2 px-3 rounded whitespace-nowrap transition-colors ${
                      activeTab === tab 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : isUSAsset 
                          ? 'bg-indigo-700/50 text-indigo-200 hover:bg-indigo-600'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleDataChange}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </button>
            
            <button
              onClick={() => setShowHorizontal(!showHorizontal)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {showHorizontal ? <LayoutGrid className="h-4 w-4" /> : <ListOrdered className="h-4 w-4" />}
              <span>{showHorizontal ? "Grade" : "Lista"}</span>
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowNewAssetModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Investimento</span>
            </button>
            
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!activeTab}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Operação</span>
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'dashboard' : viewMode === 'dashboard' ? 'all' : 'table')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {viewMode === 'table' ? (
                <>
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </>
              ) : viewMode === 'dashboard' ? (
                <>
                  <BarChart3 className="h-4 w-4" />
                  <span>Tudo</span>
                </>
              ) : (
                <>
                  <Table className="h-4 w-4" />
                  <span>Tabela</span>
                </>
              )}
            </button>
            
            <button
              onClick={exportSingleAsset}
              disabled={!activeTab}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              <span>Excel {activeTab}</span>
            </button>
            
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Excel Completo</span>
            </button>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 w-full text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 🚀 CONTEÚDO PRINCIPAL - RENDERIZAÇÃO BASEADA EM ABAS */}
        <AnimatePresence mode="wait">
          {/* 📊 VERIFICAR SE É UMA ABA PRINCIPAL */}
          {['overview', 'dashboard', 'portfolio', 'settings'].includes(activeTab) ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {activeTab === 'overview' && <OverviewTab portfolios={portfolios} />}
              {activeTab === 'dashboard' && <DashboardTab portfolios={portfolios} />}
              {activeTab === 'portfolio' && (
                <PortfolioTab 
                  portfolios={portfolios}
                  onAddInvestment={() => setShowAddModal(true)}
                  onNewAsset={() => setShowNewAssetModal(true)}
                />
              )}
              {activeTab === 'settings' && <SettingsTab onLogout={handleLogout} />}
            </motion.div>
          ) : viewMode === 'table' ? (
            <motion.div
              key="table"
              layoutId="mainContent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <InvestmentTable
                portfolio={portfolios.find(p => p.ticker === activeTab)}
                investments={portfolios.find(p => p.ticker === activeTab)?.investments || []}
                metadata={portfolios.find(p => p.ticker === activeTab)?.metadata || null}
                activeTab={activeTab} 
                onDataChange={handleDataChange}
                onEditInvestment={handleEditInvestment}
                readOnly={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              layoutId="mainContent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {viewMode === 'all' ? (
                <div className="space-y-12">
                  {portfolios.map((portfolio) => (
                    <div key={portfolio.ticker} className="mb-8 border-b border-slate-700 pb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
                          {portfolio.ticker}
                          <span className="text-sm px-2 py-1 rounded-full bg-slate-700">
                            {portfolio.metadata?.pais === 'EUA' ? '🇺🇸' : '🇧🇷'}
                          </span>
                          <span className="text-sm text-slate-400">
                            {portfolio.metadata?.nome}
                          </span>
                        </h2>
                        <span className="text-lg font-bold text-white">
                          {portfolio.currentPosition} cotas
                        </span>
                      </div>
                      
                      <InvestmentTable
                        investments={portfolio.investments}
                        metadata={portfolio.metadata}
                        activeTab={portfolio.ticker} 
                        onDataChange={handleDataChange}
                        onEditInvestment={handleEditInvestment}
                        readOnly={false}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {portfolios.map((portfolio, index) => (
                    <AssetCard 
                      key={portfolio.ticker}
                      portfolio={portfolio}
                      onClick={() => setSelectedAsset(portfolio.ticker)}
                      isActive={selectedAsset === portfolio.ticker}
                      index={index}
                    />
                  ))}
                </div>
              )}
              
              {selectedAsset && (
                <Summary 
                  portfolio={portfolios.find(p => p.ticker === selectedAsset)!}
                  marketData={null}
                />
              )}
              
              {!selectedAsset && (
                <>
                  <AdvancedDashboard portfolios={portfolios} />
                  
                  {/* Resumo Total da Carteira - No Final */}
                  <div className="mt-12">
                    <PortfolioSummary portfolios={portfolios} />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Modais */}
      <AddInvestmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        activeTab={activeTab}
        metadata={portfolios.find(p => p.ticker === activeTab)?.metadata ? {
          ...portfolios.find(p => p.ticker === activeTab)!.metadata!,
          id: activeTab,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as SupabaseAssetMetadata : null}
        onSuccess={handleModalSuccess}
      />
      
      <EditInvestmentModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingInvestment(null);
        }}
        investment={editingInvestment as any}
        metadata={portfolios.find(p => p.ticker === activeTab)?.metadata ? {
          ...portfolios.find(p => p.ticker === activeTab)!.metadata!,
          id: activeTab,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as SupabaseAssetMetadata : null}
        onSuccess={handleModalSuccess}
      />
      
      <NewAssetModal
        isOpen={showNewAssetModal}
        onClose={() => setShowNewAssetModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default App;