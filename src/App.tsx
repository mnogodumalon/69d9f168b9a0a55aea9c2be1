import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import BenutzerrollenPage from '@/pages/BenutzerrollenPage';
import WissensobjektePage from '@/pages/WissensobjektePage';
import WissenslandkartenPage from '@/pages/WissenslandkartenPage';
import FeedbackUndVersionenPage from '@/pages/FeedbackUndVersionenPage';
import ObjektVerlinkungenPage from '@/pages/ObjektVerlinkungenPage';
import KartenKnotenPage from '@/pages/KartenKnotenPage';
import ObjektFeedbackZuordnungPage from '@/pages/ObjektFeedbackZuordnungPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
              <Route path="benutzerrollen" element={<BenutzerrollenPage />} />
              <Route path="wissensobjekte" element={<WissensobjektePage />} />
              <Route path="wissenslandkarten" element={<WissenslandkartenPage />} />
              <Route path="feedback-und-versionen" element={<FeedbackUndVersionenPage />} />
              <Route path="objekt-verlinkungen" element={<ObjektVerlinkungenPage />} />
              <Route path="karten-knoten" element={<KartenKnotenPage />} />
              <Route path="objekt-feedback-zuordnung" element={<ObjektFeedbackZuordnungPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
