import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Benutzerrollen, Wissenslandkarten, Wissensobjekte, ObjektFeedbackZuordnung, FeedbackUndVersionen, KartenKnoten, ObjektVerlinkungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [benutzerrollen, setBenutzerrollen] = useState<Benutzerrollen[]>([]);
  const [wissenslandkarten, setWissenslandkarten] = useState<Wissenslandkarten[]>([]);
  const [wissensobjekte, setWissensobjekte] = useState<Wissensobjekte[]>([]);
  const [objektFeedbackZuordnung, setObjektFeedbackZuordnung] = useState<ObjektFeedbackZuordnung[]>([]);
  const [feedbackUndVersionen, setFeedbackUndVersionen] = useState<FeedbackUndVersionen[]>([]);
  const [kartenKnoten, setKartenKnoten] = useState<KartenKnoten[]>([]);
  const [objektVerlinkungen, setObjektVerlinkungen] = useState<ObjektVerlinkungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [benutzerrollenData, wissenslandkartenData, wissensobjekteData, objektFeedbackZuordnungData, feedbackUndVersionenData, kartenKnotenData, objektVerlinkungenData] = await Promise.all([
        LivingAppsService.getBenutzerrollen(),
        LivingAppsService.getWissenslandkarten(),
        LivingAppsService.getWissensobjekte(),
        LivingAppsService.getObjektFeedbackZuordnung(),
        LivingAppsService.getFeedbackUndVersionen(),
        LivingAppsService.getKartenKnoten(),
        LivingAppsService.getObjektVerlinkungen(),
      ]);
      setBenutzerrollen(benutzerrollenData);
      setWissenslandkarten(wissenslandkartenData);
      setWissensobjekte(wissensobjekteData);
      setObjektFeedbackZuordnung(objektFeedbackZuordnungData);
      setFeedbackUndVersionen(feedbackUndVersionenData);
      setKartenKnoten(kartenKnotenData);
      setObjektVerlinkungen(objektVerlinkungenData);
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
        const [benutzerrollenData, wissenslandkartenData, wissensobjekteData, objektFeedbackZuordnungData, feedbackUndVersionenData, kartenKnotenData, objektVerlinkungenData] = await Promise.all([
          LivingAppsService.getBenutzerrollen(),
          LivingAppsService.getWissenslandkarten(),
          LivingAppsService.getWissensobjekte(),
          LivingAppsService.getObjektFeedbackZuordnung(),
          LivingAppsService.getFeedbackUndVersionen(),
          LivingAppsService.getKartenKnoten(),
          LivingAppsService.getObjektVerlinkungen(),
        ]);
        setBenutzerrollen(benutzerrollenData);
        setWissenslandkarten(wissenslandkartenData);
        setWissensobjekte(wissensobjekteData);
        setObjektFeedbackZuordnung(objektFeedbackZuordnungData);
        setFeedbackUndVersionen(feedbackUndVersionenData);
        setKartenKnoten(kartenKnotenData);
        setObjektVerlinkungen(objektVerlinkungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const benutzerrollenMap = useMemo(() => {
    const m = new Map<string, Benutzerrollen>();
    benutzerrollen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [benutzerrollen]);

  const wissenslandkartenMap = useMemo(() => {
    const m = new Map<string, Wissenslandkarten>();
    wissenslandkarten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [wissenslandkarten]);

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

  return { benutzerrollen, setBenutzerrollen, wissenslandkarten, setWissenslandkarten, wissensobjekte, setWissensobjekte, objektFeedbackZuordnung, setObjektFeedbackZuordnung, feedbackUndVersionen, setFeedbackUndVersionen, kartenKnoten, setKartenKnoten, objektVerlinkungen, setObjektVerlinkungen, loading, error, fetchAll, benutzerrollenMap, wissenslandkartenMap, wissensobjekteMap, feedbackUndVersionenMap };
}