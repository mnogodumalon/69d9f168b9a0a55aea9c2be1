import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Benutzerrollen, Wissensobjekte, Wissenslandkarten, FeedbackUndVersionen, ObjektVerlinkungen, KartenKnoten, ObjektFeedbackZuordnung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [benutzerrollen, setBenutzerrollen] = useState<Benutzerrollen[]>([]);
  const [wissensobjekte, setWissensobjekte] = useState<Wissensobjekte[]>([]);
  const [wissenslandkarten, setWissenslandkarten] = useState<Wissenslandkarten[]>([]);
  const [feedbackUndVersionen, setFeedbackUndVersionen] = useState<FeedbackUndVersionen[]>([]);
  const [objektVerlinkungen, setObjektVerlinkungen] = useState<ObjektVerlinkungen[]>([]);
  const [kartenKnoten, setKartenKnoten] = useState<KartenKnoten[]>([]);
  const [objektFeedbackZuordnung, setObjektFeedbackZuordnung] = useState<ObjektFeedbackZuordnung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [benutzerrollenData, wissensobjekteData, wissenslandkartenData, feedbackUndVersionenData, objektVerlinkungenData, kartenKnotenData, objektFeedbackZuordnungData] = await Promise.all([
        LivingAppsService.getBenutzerrollen(),
        LivingAppsService.getWissensobjekte(),
        LivingAppsService.getWissenslandkarten(),
        LivingAppsService.getFeedbackUndVersionen(),
        LivingAppsService.getObjektVerlinkungen(),
        LivingAppsService.getKartenKnoten(),
        LivingAppsService.getObjektFeedbackZuordnung(),
      ]);
      setBenutzerrollen(benutzerrollenData);
      setWissensobjekte(wissensobjekteData);
      setWissenslandkarten(wissenslandkartenData);
      setFeedbackUndVersionen(feedbackUndVersionenData);
      setObjektVerlinkungen(objektVerlinkungenData);
      setKartenKnoten(kartenKnotenData);
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
        const [benutzerrollenData, wissensobjekteData, wissenslandkartenData, feedbackUndVersionenData, objektVerlinkungenData, kartenKnotenData, objektFeedbackZuordnungData] = await Promise.all([
          LivingAppsService.getBenutzerrollen(),
          LivingAppsService.getWissensobjekte(),
          LivingAppsService.getWissenslandkarten(),
          LivingAppsService.getFeedbackUndVersionen(),
          LivingAppsService.getObjektVerlinkungen(),
          LivingAppsService.getKartenKnoten(),
          LivingAppsService.getObjektFeedbackZuordnung(),
        ]);
        setBenutzerrollen(benutzerrollenData);
        setWissensobjekte(wissensobjekteData);
        setWissenslandkarten(wissenslandkartenData);
        setFeedbackUndVersionen(feedbackUndVersionenData);
        setObjektVerlinkungen(objektVerlinkungenData);
        setKartenKnoten(kartenKnotenData);
        setObjektFeedbackZuordnung(objektFeedbackZuordnungData);
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

  const wissensobjekteMap = useMemo(() => {
    const m = new Map<string, Wissensobjekte>();
    wissensobjekte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [wissensobjekte]);

  const wissenslandkartenMap = useMemo(() => {
    const m = new Map<string, Wissenslandkarten>();
    wissenslandkarten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [wissenslandkarten]);

  const feedbackUndVersionenMap = useMemo(() => {
    const m = new Map<string, FeedbackUndVersionen>();
    feedbackUndVersionen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [feedbackUndVersionen]);

  return { benutzerrollen, setBenutzerrollen, wissensobjekte, setWissensobjekte, wissenslandkarten, setWissenslandkarten, feedbackUndVersionen, setFeedbackUndVersionen, objektVerlinkungen, setObjektVerlinkungen, kartenKnoten, setKartenKnoten, objektFeedbackZuordnung, setObjektFeedbackZuordnung, loading, error, fetchAll, benutzerrollenMap, wissensobjekteMap, wissenslandkartenMap, feedbackUndVersionenMap };
}