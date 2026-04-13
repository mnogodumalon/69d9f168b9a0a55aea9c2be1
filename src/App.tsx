import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import BenutzerrollenPage from '@/pages/BenutzerrollenPage';
import WissenslandkartenPage from '@/pages/WissenslandkartenPage';
import WissensobjektePage from '@/pages/WissensobjektePage';
import ObjektFeedbackZuordnungPage from '@/pages/ObjektFeedbackZuordnungPage';
import FeedbackUndVersionenPage from '@/pages/FeedbackUndVersionenPage';
import KartenKnotenPage from '@/pages/KartenKnotenPage';
import ObjektVerlinkungenPage from '@/pages/ObjektVerlinkungenPage';
import KuratiereWissensobjektPage from '@/pages/intents/KuratiereWissensobjektPage';
import BefuelleWissenskartePage from '@/pages/intents/BefuelleWissenskartePage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="benutzerrollen" element={<BenutzerrollenPage />} />
              <Route path="wissenslandkarten" element={<WissenslandkartenPage />} />
              <Route path="wissensobjekte" element={<WissensobjektePage />} />
              <Route path="objekt-feedback-zuordnung" element={<ObjektFeedbackZuordnungPage />} />
              <Route path="feedback-und-versionen" element={<FeedbackUndVersionenPage />} />
              <Route path="karten-knoten" element={<KartenKnotenPage />} />
              <Route path="objekt-verlinkungen" element={<ObjektVerlinkungenPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="intents/kuratiere-wissensobjekt" element={<KuratiereWissensobjektPage />} />
              <Route path="intents/befuelle-wissenskarte" element={<BefuelleWissenskartePage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
