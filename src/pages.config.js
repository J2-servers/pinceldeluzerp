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
import Clientes from './pages/Clientes';
import Configuracoes from './pages/Configuracoes';
import Dashboard from './pages/Dashboard';
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import NotasFiscais from './pages/NotasFiscais';
import Orcamentos from './pages/Orcamentos';
import OrdensServico from './pages/OrdensServico';
import Precificacao from './pages/Precificacao';
import Producao from './pages/Producao';
import Relatorios from './pages/Relatorios';
import Vendas from './pages/Vendas';
import WhatsApp from './pages/WhatsApp';
import Agenda from './pages/Agenda';
import Metas from './pages/Metas';
import Patrimonio from './pages/Patrimonio';
import Integracoes from './pages/Integracoes';
import Usuarios from './pages/Usuarios';
import MobileDashboard from './pages/MobileDashboard';
import MobileDespesasDoDia from './pages/MobileDespesasDoDia';
import MobileProjetosDoDia from './pages/MobileProjetosDoDia';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Orcamentos": Orcamentos,
    "Vendas": Vendas,
    "Producao": Producao,
    "OrdensServico": OrdensServico,
    "Estoque": Estoque,
    "Clientes": Clientes,
    "Financeiro": Financeiro,
    "Relatorios": Relatorios,
    "Precificacao": Precificacao,
    "WhatsApp": WhatsApp,
    "NotasFiscais": NotasFiscais,
    "Agenda": Agenda,
    "Metas": Metas,
    "Patrimonio": Patrimonio,
    "Integracoes": Integracoes,
    "Usuarios": Usuarios,
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
