import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KartenKnotenPage from '@/pages/KartenKnotenPage';
import WissensobjektePage from '@/pages/WissensobjektePage';
import FeedbackUndVersionenPage from '@/pages/FeedbackUndVersionenPage';
import WissenslandkartenPage from '@/pages/WissenslandkartenPage';
import BenutzerrollenPage from '@/pages/BenutzerrollenPage';
import ObjektVerlinkungenPage from '@/pages/ObjektVerlinkungenPage';
import ObjektFeedbackZuordnungPage from '@/pages/ObjektFeedbackZuordnungPage';
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="karten-knoten" element={<KartenKnotenPage />} />
              <Route path="wissensobjekte" element={<WissensobjektePage />} />
              <Route path="feedback-und-versionen" element={<FeedbackUndVersionenPage />} />
              <Route path="wissenslandkarten" element={<WissenslandkartenPage />} />
              <Route path="benutzerrollen" element={<BenutzerrollenPage />} />
              <Route path="objekt-verlinkungen" element={<ObjektVerlinkungenPage />} />
              <Route path="objekt-feedback-zuordnung" element={<ObjektFeedbackZuordnungPage />} />
              <Route path="admin" element={<AdminPage />} />
              {/* <custom:routes> */}
              {/* </custom:routes> */}
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
