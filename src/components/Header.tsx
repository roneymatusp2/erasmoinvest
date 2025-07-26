import React from 'react';
import { Trophy, TrendingUp, PieChart, Settings, BarChart3 } from 'lucide-react';


interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: PieChart },
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfólio', icon: Trophy },
    { id: 'charts', label: 'Gráficos', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Lado Esquerdo: Logo e Título */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onTabChange('overview')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-2 rounded-lg shadow-lg">
                <Trophy className="h-8 w-8 text-blue-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
                  Erasmo Invest
                </h1>
                <p className="text-blue-200 text-sm">Sistema de Gestão de Investimentos</p>
              </div>
            </button>
          </div>


        </div>
        
        <nav className="flex space-x-1 pb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentTab === tab.id
                    ? 'bg-white bg-opacity-20 text-white shadow-lg'
                    : 'text-blue-200 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;