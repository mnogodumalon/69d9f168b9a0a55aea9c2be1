import type { FeedbackUndVersionen, KartenKnoten, ObjektFeedbackZuordnung, ObjektVerlinkungen, Wissenslandkarten, Wissensobjekte } from './app';

export type EnrichedKartenKnoten = KartenKnoten & {
  mn_mapName: string;
  mn_itemName: string;
  mn_added_byName: string;
};

export type EnrichedWissensobjekte = Wissensobjekte & {
  authorName: string;
  curatorName: string;
};

export type EnrichedFeedbackUndVersionen = FeedbackUndVersionen & {
  related_itemName: string;
  responsible_personName: string;
};

export type EnrichedWissenslandkarten = Wissenslandkarten & {
  map_creatorName: string;
};

export type EnrichedObjektVerlinkungen = ObjektVerlinkungen & {
  item_fromName: string;
  item_toName: string;
  il_created_byName: string;
};

export type EnrichedObjektFeedbackZuordnung = ObjektFeedbackZuordnung & {
  if_knowledge_itemName: string;
  if_feedback_versionName: string;
};
