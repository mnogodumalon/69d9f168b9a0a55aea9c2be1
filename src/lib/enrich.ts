import type { EnrichedFeedbackUndVersionen, EnrichedKartenKnoten, EnrichedObjektFeedbackZuordnung, EnrichedObjektVerlinkungen, EnrichedWissenslandkarten, EnrichedWissensobjekte } from '@/types/enriched';
import type { Benutzerrollen, FeedbackUndVersionen, KartenKnoten, ObjektFeedbackZuordnung, ObjektVerlinkungen, Wissenslandkarten, Wissensobjekte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface WissenslandkartenMaps {
  benutzerrollenMap: Map<string, Benutzerrollen>;
}

export function enrichWissenslandkarten(
  wissenslandkarten: Wissenslandkarten[],
  maps: WissenslandkartenMaps
): EnrichedWissenslandkarten[] {
  return wissenslandkarten.map(r => ({
    ...r,
    map_creatorName: resolveDisplay(r.fields.map_creator, maps.benutzerrollenMap, 'firstname'),
  }));
}

interface WissensobjekteMaps {
  benutzerrollenMap: Map<string, Benutzerrollen>;
}

export function enrichWissensobjekte(
  wissensobjekte: Wissensobjekte[],
  maps: WissensobjekteMaps
): EnrichedWissensobjekte[] {
  return wissensobjekte.map(r => ({
    ...r,
    authorName: resolveDisplay(r.fields.author, maps.benutzerrollenMap, 'firstname'),
    curatorName: resolveDisplay(r.fields.curator, maps.benutzerrollenMap, 'firstname'),
  }));
}

interface ObjektFeedbackZuordnungMaps {
  wissensobjekteMap: Map<string, Wissensobjekte>;
  feedbackUndVersionenMap: Map<string, FeedbackUndVersionen>;
}

export function enrichObjektFeedbackZuordnung(
  objektFeedbackZuordnung: ObjektFeedbackZuordnung[],
  maps: ObjektFeedbackZuordnungMaps
): EnrichedObjektFeedbackZuordnung[] {
  return objektFeedbackZuordnung.map(r => ({
    ...r,
    if_knowledge_itemName: resolveDisplay(r.fields.if_knowledge_item, maps.wissensobjekteMap, 'title'),
    if_feedback_versionName: resolveDisplay(r.fields.if_feedback_version, maps.feedbackUndVersionenMap, 'version_number'),
  }));
}

interface FeedbackUndVersionenMaps {
  wissensobjekteMap: Map<string, Wissensobjekte>;
  benutzerrollenMap: Map<string, Benutzerrollen>;
}

export function enrichFeedbackUndVersionen(
  feedbackUndVersionen: FeedbackUndVersionen[],
  maps: FeedbackUndVersionenMaps
): EnrichedFeedbackUndVersionen[] {
  return feedbackUndVersionen.map(r => ({
    ...r,
    related_itemName: resolveDisplay(r.fields.related_item, maps.wissensobjekteMap, 'title'),
    responsible_personName: resolveDisplay(r.fields.responsible_person, maps.benutzerrollenMap, 'firstname'),
  }));
}

interface KartenKnotenMaps {
  wissenslandkartenMap: Map<string, Wissenslandkarten>;
  wissensobjekteMap: Map<string, Wissensobjekte>;
  benutzerrollenMap: Map<string, Benutzerrollen>;
}

export function enrichKartenKnoten(
  kartenKnoten: KartenKnoten[],
  maps: KartenKnotenMaps
): EnrichedKartenKnoten[] {
  return kartenKnoten.map(r => ({
    ...r,
    mn_mapName: resolveDisplay(r.fields.mn_map, maps.wissenslandkartenMap, 'map_title'),
    mn_itemName: resolveDisplay(r.fields.mn_item, maps.wissensobjekteMap, 'title'),
    mn_added_byName: resolveDisplay(r.fields.mn_added_by, maps.benutzerrollenMap, 'firstname'),
  }));
}

interface ObjektVerlinkungenMaps {
  wissensobjekteMap: Map<string, Wissensobjekte>;
  benutzerrollenMap: Map<string, Benutzerrollen>;
}

export function enrichObjektVerlinkungen(
  objektVerlinkungen: ObjektVerlinkungen[],
  maps: ObjektVerlinkungenMaps
): EnrichedObjektVerlinkungen[] {
  return objektVerlinkungen.map(r => ({
    ...r,
    item_fromName: resolveDisplay(r.fields.item_from, maps.wissensobjekteMap, 'title'),
    item_toName: resolveDisplay(r.fields.item_to, maps.wissensobjekteMap, 'title'),
    il_created_byName: resolveDisplay(r.fields.il_created_by, maps.benutzerrollenMap, 'firstname'),
  }));
}
