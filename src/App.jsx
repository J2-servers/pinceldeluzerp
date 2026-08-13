import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { SessionProvider, useSession } from '@/lib/auth/useAuth';
import LoginScreen from '@/components/auth/LoginScreen';
import AccessDenied from '@/components/auth/AccessDenied';
import { PAGE_PERMISSION, can } from '@/lib/auth/permissions';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function PageLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );
}

// Envolve uma página com a checagem de permissão de leitura do módulo.
function Guarded({ pageKey, children }) {
  const { user } = useSession();
  const required = PAGE_PERMISSION[pageKey];
  if (required && !can(user, required)) {
    return <AccessDenied pageKey={pageKey} required={required} />;
  }
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

const AuthenticatedApp = () => {
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <Guarded pageKey={mainPageKey}><MainPage /></Guarded>
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Guarded pageKey={path}><Page /></Guarded>
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  )
}

export default App
