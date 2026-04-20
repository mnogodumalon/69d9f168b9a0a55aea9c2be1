import { useState, useEffect, useMemo, useCallback } from 'react';
import type { KartenKnoten, Wissensobjekte, FeedbackUndVersionen, Wissenslandkarten, Benutzerrollen, ObjektVerlinkungen, ObjektFeedbackZuordnung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kartenKnoten, setKartenKnoten] = useState<KartenKnoten[]>([]);
  const [wissensobjekte, setWissensobjekte] = useState<Wissensobjekte[]>([]);
  const [feedbackUndVersionen, setFeedbackUndVersionen] = useState<FeedbackUndVersionen[]>([]);
  const [wissenslandkarten, setWissenslandkarten] = useState<Wissenslandkarten[]>([]);
  const [benutzerrollen, setBenutzerrollen] = useState<Benutzerrollen[]>([]);
  const [objektVerlinkungen, setObjektVerlinkungen] = useState<ObjektVerlinkungen[]>([]);
  const [objektFeedbackZuordnung, setObjektFeedbackZuordnung] = useState<ObjektFeedbackZuordnung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kartenKnotenData, wissensobjekteData, feedbackUndVersionenData, wissenslandkartenData, benutzerrollenData, objektVerlinkungenData, objektFeedbackZuordnungData] = await Promise.all([
        LivingAppsService.getKartenKnoten(),
        LivingAppsService.getWissensobjekte(),
        LivingAppsService.getFeedbackUndVersionen(),
        LivingAppsService.getWissenslandkarten(),
        LivingAppsService.getBenutzerrollen(),
        LivingAppsService.getObjektVerlinkungen(),
        LivingAppsService.getObjektFeedbackZuordnung(),
      ]);
      setKartenKnoten(kartenKnotenData);
      setWissensobjekte(wissensobjekteData);
      setFeedbackUndVersionen(feedbackUndVersionenData);
      setWissenslandkarten(wissenslandkartenData);
      setBenutzerrollen(benutzerrollenData);
      setObjektVerlinkungen(objektVerlinkungenData);
      setObjektFeedbackZuordnung(objektFeedbackZuordnungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [kartenKnotenData, wissensobjekteData, feedbackUndVersionenData, wissenslandkartenData, benutzerrollenData, objektVerlinkungenData, objektFeedbackZuordnungData] = await Promise.all([
          LivingAppsService.getKartenKnoten(),
          LivingAppsService.getWissensobjekte(),
          LivingAppsService.getFeedbackUndVersionen(),
          LivingAppsService.getWissenslandkarten(),
          LivingAppsService.getBenutzerrollen(),
          LivingAppsService.getObjektVerlinkungen(),
          LivingAppsService.getObjektFeedbackZuordnung(),
        ]);
        setKartenKnoten(kartenKnotenData);
        setWissensobjekte(wissensobjekteData);
        setFeedbackUndVersionen(feedbackUndVersionenData);
        setWissenslandkarten(wissenslandkartenData);
        setBenutzerrollen(benutzerrollenData);
        setObjektVerlinkungen(objektVerlinkungenData);
        setObjektFeedbackZuordnung(objektFeedbackZuordnungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const wissensobjekteMap = useMemo(() => {
    const m = new Map<string, Wissensobjekte>();
    wissensobjekte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [wissensobjekte]);

  const feedbackUndVersionenMap = useMemo(() => {
    const m = new Map<string, FeedbackUndVersionen>();
    feedbackUndVersionen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [feedbackUndVersionen]);

  const wissenslandkartenMap = useMemo(() => {
    const m = new Map<string, Wissenslandkarten>();
    wissenslandkarten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [wissenslandkarten]);

  const benutzerrollenMap = useMemo(() => {
    const m = new Map<string, Benutzerrollen>();
    benutzerrollen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [benutzerrollen]);

  return { kartenKnoten, setKartenKnoten, wissensobjekte, setWissensobjekte, feedbackUndVersionen, setFeedbackUndVersionen, wissenslandkarten, setWissenslandkarten, benutzerrollen, setBenutzerrollen, objektVerlinkungen, setObjektVerlinkungen, objektFeedbackZuordnung, setObjektFeedbackZuordnung, loading, error, fetchAll, wissensobjekteMap, feedbackUndVersionenMap, wissenslandkartenMap, benutzerrollenMap };
}