/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Cada pagina vira o proprio chunk JS, baixado so quando a rota e visitada.
const Clientes = lazy(() => import('./pages/Clientes'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Estoque = lazy(() => import('./pages/Estoque'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const NotasFiscais = lazy(() => import('./pages/NotasFiscais'));
const Orcamentos = lazy(() => import('./pages/Orcamentos'));
const OrdensServico = lazy(() => import('./pages/OrdensServico'));
const Precificacao = lazy(() => import('./pages/Precificacao'));
const Producao = lazy(() => import('./pages/Producao'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Vendas = lazy(() => import('./pages/Vendas'));
const WhatsApp = lazy(() => import('./pages/WhatsApp'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Metas = lazy(() => import('./pages/Metas'));
const Patrimonio = lazy(() => import('./pages/Patrimonio'));
const Integracoes = lazy(() => import('./pages/Integracoes'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const MobileDashboard = lazy(() => import('./pages/MobileDashboard'));
const MobileDespesasDoDia = lazy(() => import('./pages/MobileDespesasDoDia'));
const MobileProjetosDoDia = lazy(() => import('./pages/MobileProjetosDoDia'));
const DRE = lazy(() => import('./pages/DRE'));
const Auditoria = lazy(() => import('./pages/Auditoria'));


export const PAGES = {
    "Dashboard": Dashboard,
    "Orcamentos": Orcamentos,
    "Vendas": Vendas,
    "Producao": Producao,
    "OrdensServico": OrdensServico,
    "Estoque": Estoque,
    "Clientes": Clientes,
    "Financeiro": Financeiro,
    "DRE": DRE,
    "Relatorios": Relatorios,
    "Precificacao": Precificacao,
    "WhatsApp": WhatsApp,
    "NotasFiscais": NotasFiscais,
    "Agenda": Agenda,
    "Metas": Metas,
    "Patrimonio": Patrimonio,
    "Integracoes": Integracoes,
    "Usuarios": Usuarios,
    "Auditoria": Auditoria,
    "MobileDashboard": MobileDashboard,
    "MobileDespesasDoDia": MobileDespesasDoDia,
    "MobileProjetosDoDia": MobileProjetosDoDia,
    "Configuracoes": Configuracoes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
