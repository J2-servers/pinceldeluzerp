import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav.jsx';
import { Toaster as HotToaster } from '@/components/ui/app-toast';
import { erp } from '@/api/erpClient';
import { createPageUrl } from '@/utils';
import { applyFavicon, getCompanyLogoUrl } from '@/lib/brandingAssets';

const MOBILE_PAGES = ['MobileDashboard', 'MobileProjetosDoDia', 'MobileDespesasDoDia'];

function applyTheme(isDark) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.classList.toggle('dark-theme', isDark);
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('dark-theme', isDark);
}

export default function Layout({ children, currentPageName }) {
  const isMobilePage = MOBILE_PAGES.includes(currentPageName);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyConfig, setCompanyConfig] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('pincel-theme');
    applyTheme(saved === 'dark');

    let alive = true;
    erp.entities.CompanyConfig.list('-created_date', 1)
      .then((configs) => {
        if (!alive) return;
        const config = configs[0] || null;
        setCompanyConfig(config);
        applyFavicon(getCompanyLogoUrl(config, 'favicon'));
      })
      .catch((error) => console.warn('[Layout] CompanyConfig:', error));

    return () => {
      alive = false;
    };
  }, []);

  const companyLogo = getCompanyLogoUrl(companyConfig, 'app');
  const companyName = companyConfig?.company_name || 'Pincel de Luz';
  const openPersonalization = () => {
    window.location.href = `${createPageUrl('Configuracoes')}?tab=personalizacao`;
  };

  return (
    <div className="min-h-screen app-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:px-4 focus:py-2"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Ir para o conteudo principal
      </a>

      {!isMobilePage && (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          companyLogo={companyLogo}
          companyName={companyName}
        />
      )}

      {isMobilePage ? (
        <main id="main-content" className="relative z-10 min-h-screen">
          {children}
        </main>
      ) : (
        <motion.main
          id="main-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 min-h-screen px-4 pb-24 md:pb-8 md:pr-6"
        >
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            companyLogo={companyLogo}
            companyName={companyName}
            onLogoClick={openPersonalization}
          />
          <div className="page-enter">{children}</div>
        </motion.main>
      )}

      <MobileNav />
      <HotToaster />
    </div>
  );
}
