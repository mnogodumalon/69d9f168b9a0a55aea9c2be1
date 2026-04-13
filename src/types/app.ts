// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface KartenKnoten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mn_map?: string; // applookup -> URL zu 'Wissenslandkarten' Record
    mn_item?: string; // applookup -> URL zu 'Wissensobjekte' Record
    pos_x?: number;
    pos_y?: number;
    node_layout_data?: string;
    node_label?: string;
    mn_added_at?: string; // Format: YYYY-MM-DD oder ISO String
    mn_added_by?: string; // applookup -> URL zu 'Benutzerrollen' Record
  };
}

export interface Wissensobjekte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    title?: string;
    content?: string;
    phase?: LookupValue;
    knowledge_type?: LookupValue;
    quality_score?: number;
    ai_summary?: string;
    tacit_extraction_log?: string;
    version?: string;
    author?: string; // applookup -> URL zu 'Benutzerrollen' Record
    curator?: string; // applookup -> URL zu 'Benutzerrollen' Record
    ai_support?: boolean;
    last_modified?: string; // Format: YYYY-MM-DD oder ISO String
    application_evidence?: string;
    attachment?: string;
  };
}

export interface FeedbackUndVersionen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    related_item?: string; // applookup -> URL zu 'Wissensobjekte' Record
    version_number?: string;
    change_type?: LookupValue;
    feedback_text?: string;
    rating?: number;
    timestamp?: string; // Format: YYYY-MM-DD oder ISO String
    responsible_person?: string; // applookup -> URL zu 'Benutzerrollen' Record
  };
}

export interface Wissenslandkarten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    map_title?: string;
    map_type?: LookupValue;
    map_description?: string;
    nodes_data?: string;
    edges_data?: string;
    layout_data?: string;
    map_creator?: string; // applookup -> URL zu 'Benutzerrollen' Record
    map_created_at?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Benutzerrollen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    role?: LookupValue;
    department?: string;
    active?: boolean;
  };
}

export interface ObjektVerlinkungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    item_from?: string; // applookup -> URL zu 'Wissensobjekte' Record
    item_to?: string; // applookup -> URL zu 'Wissensobjekte' Record
    link_type?: LookupValue;
    link_strength?: number;
    il_created_at?: string; // Format: YYYY-MM-DD oder ISO String
    il_created_by?: string; // applookup -> URL zu 'Benutzerrollen' Record
    link_justification?: string;
  };
}

export interface ObjektFeedbackZuordnung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    if_knowledge_item?: string; // applookup -> URL zu 'Wissensobjekte' Record
    if_feedback_version?: string; // applookup -> URL zu 'FeedbackUndVersionen' Record
    if_giver_role?: LookupValue;
  };
}

export const APP_IDS = {
  KARTEN_KNOTEN: '69d9f141e5230ce9751658ee',
  WISSENSOBJEKTE: '69d9f13e60220ce3295e28ad',
  FEEDBACK_UND_VERSIONEN: '69d9f1405df3db2093b4586f',
  WISSENSLANDKARTEN: '69d9f13f1ee82a740e80b81e',
  BENUTZERROLLEN: '69d9f1389d64c3f691ecb8d3',
  OBJEKT_VERLINKUNGEN: '69d9f1418429e36499978448',
  OBJEKT_FEEDBACK_ZUORDNUNG: '69d9f14262791cab74c8171b',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'wissensobjekte': {
    phase: [{ key: "discovery", label: "Discovery" }, { key: "codification", label: "Codification" }, { key: "dissemination", label: "Dissemination" }, { key: "application", label: "Application" }, { key: "archived", label: "Archived" }],
    knowledge_type: [{ key: "explicit", label: "Explicit" }, { key: "tacit_extracted", label: "Tacit-extracted" }, { key: "hybrid", label: "Hybrid" }, { key: "process", label: "Process" }, { key: "lesson_learned", label: "Lesson Learned" }],
  },
  'feedback_und_versionen': {
    change_type: [{ key: "edit", label: "Edit" }, { key: "feedback", label: "Feedback" }, { key: "statuswechsel", label: "Statuswechsel" }, { key: "ai_extraktion", label: "AI-Extraktion" }],
  },
  'wissenslandkarten': {
    map_type: [{ key: "prozesslandkarte", label: "Prozesslandkarte" }, { key: "themen_cluster", label: "Themen-Cluster" }, { key: "wissensgraph", label: "Wissensgraph" }, { key: "mindmap", label: "Mindmap" }],
  },
  'benutzerrollen': {
    role: [{ key: "contributor", label: "Contributor" }, { key: "facilitator", label: "Facilitator" }, { key: "curator", label: "Curator" }, { key: "ai_support", label: "AI-Support" }, { key: "admin", label: "Admin" }, { key: "viewer", label: "Viewer" }],
  },
  'objekt_verlinkungen': {
    link_type: [{ key: "related", label: "Related" }, { key: "prerequisite", label: "Prerequisite" }, { key: "extends", label: "Extends" }, { key: "see_also", label: "See Also" }],
  },
  'objekt_feedback_zuordnung': {
    if_giver_role: [{ key: "contributor", label: "Contributor" }, { key: "facilitator", label: "Facilitator" }, { key: "curator", label: "Curator" }, { key: "ai_support", label: "AI-Support" }, { key: "admin", label: "Admin" }, { key: "viewer", label: "Viewer" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'karten_knoten': {
    'mn_map': 'applookup/select',
    'mn_item': 'applookup/select',
    'pos_x': 'number',
    'pos_y': 'number',
    'node_layout_data': 'string/text',
    'node_label': 'string/text',
    'mn_added_at': 'date/datetimeminute',
    'mn_added_by': 'applookup/select',
  },
  'wissensobjekte': {
    'title': 'string/text',
    'content': 'string/textarea',
    'phase': 'lookup/select',
    'knowledge_type': 'lookup/select',
    'quality_score': 'number',
    'ai_summary': 'string/textarea',
    'tacit_extraction_log': 'string/textarea',
    'version': 'string/text',
    'author': 'applookup/select',
    'curator': 'applookup/select',
    'ai_support': 'bool',
    'last_modified': 'date/datetimeminute',
    'application_evidence': 'string/textarea',
    'attachment': 'file',
  },
  'feedback_und_versionen': {
    'related_item': 'applookup/select',
    'version_number': 'string/text',
    'change_type': 'lookup/select',
    'feedback_text': 'string/textarea',
    'rating': 'number',
    'timestamp': 'date/datetimeminute',
    'responsible_person': 'applookup/select',
  },
  'wissenslandkarten': {
    'map_title': 'string/text',
    'map_type': 'lookup/select',
    'map_description': 'string/textarea',
    'nodes_data': 'string/textarea',
    'edges_data': 'string/textarea',
    'layout_data': 'string/textarea',
    'map_creator': 'applookup/select',
    'map_created_at': 'date/datetimeminute',
  },
  'benutzerrollen': {
    'firstname': 'string/text',
    'lastname': 'string/text',
    'email': 'string/email',
    'phone': 'string/tel',
    'role': 'lookup/select',
    'department': 'string/text',
    'active': 'bool',
  },
  'objekt_verlinkungen': {
    'item_from': 'applookup/select',
    'item_to': 'applookup/select',
    'link_type': 'lookup/select',
    'link_strength': 'number',
    'il_created_at': 'date/datetimeminute',
    'il_created_by': 'applookup/select',
    'link_justification': 'string/textarea',
  },
  'objekt_feedback_zuordnung': {
    'if_knowledge_item': 'applookup/select',
    'if_feedback_version': 'applookup/select',
    'if_giver_role': 'lookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKartenKnoten = StripLookup<KartenKnoten['fields']>;
export type CreateWissensobjekte = StripLookup<Wissensobjekte['fields']>;
export type CreateFeedbackUndVersionen = StripLookup<FeedbackUndVersionen['fields']>;
export type CreateWissenslandkarten = StripLookup<Wissenslandkarten['fields']>;
export type CreateBenutzerrollen = StripLookup<Benutzerrollen['fields']>;
export type CreateObjektVerlinkungen = StripLookup<ObjektVerlinkungen['fields']>;
export type CreateObjektFeedbackZuordnung = StripLookup<ObjektFeedbackZuordnung['fields']>;