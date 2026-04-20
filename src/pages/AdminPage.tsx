import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { KartenKnoten, Wissensobjekte, FeedbackUndVersionen, Wissenslandkarten, Benutzerrollen, ObjektVerlinkungen, ObjektFeedbackZuordnung } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { KartenKnotenDialog } from '@/components/dialogs/KartenKnotenDialog';
import { KartenKnotenViewDialog } from '@/components/dialogs/KartenKnotenViewDialog';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { WissensobjekteViewDialog } from '@/components/dialogs/WissensobjekteViewDialog';
import { FeedbackUndVersionenDialog } from '@/components/dialogs/FeedbackUndVersionenDialog';
import { FeedbackUndVersionenViewDialog } from '@/components/dialogs/FeedbackUndVersionenViewDialog';
import { WissenslandkartenDialog } from '@/components/dialogs/WissenslandkartenDialog';
import { WissenslandkartenViewDialog } from '@/components/dialogs/WissenslandkartenViewDialog';
import { BenutzerrollenDialog } from '@/components/dialogs/BenutzerrollenDialog';
import { BenutzerrollenViewDialog } from '@/components/dialogs/BenutzerrollenViewDialog';
import { ObjektVerlinkungenDialog } from '@/components/dialogs/ObjektVerlinkungenDialog';
import { ObjektVerlinkungenViewDialog } from '@/components/dialogs/ObjektVerlinkungenViewDialog';
import { ObjektFeedbackZuordnungDialog } from '@/components/dialogs/ObjektFeedbackZuordnungDialog';
import { ObjektFeedbackZuordnungViewDialog } from '@/components/dialogs/ObjektFeedbackZuordnungViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const KARTENKNOTEN_FIELDS = [
  { key: 'mn_map', label: 'Wissenslandkarte', type: 'applookup/select', targetEntity: 'wissenslandkarten', targetAppId: 'WISSENSLANDKARTEN', displayField: 'map_title' },
  { key: 'mn_item', label: 'Wissensobjekt (Node)', type: 'applookup/select', targetEntity: 'wissensobjekte', targetAppId: 'WISSENSOBJEKTE', displayField: 'title' },
  { key: 'pos_x', label: 'Position X (Koordinate)', type: 'number' },
  { key: 'pos_y', label: 'Position Y (Koordinate)', type: 'number' },
  { key: 'node_layout_data', label: 'Layout-Daten des Knotens', type: 'string/text' },
  { key: 'node_label', label: 'Angezeigter Label auf der Karte (optional)', type: 'string/text' },
  { key: 'mn_added_at', label: 'Zeitpunkt der Hinzufügung', type: 'date/datetimeminute' },
  { key: 'mn_added_by', label: 'Hinzugefügt von', type: 'applookup/select', targetEntity: 'benutzerrollen', targetAppId: 'BENUTZERROLLEN', displayField: 'firstname' },
];
const WISSENSOBJEKTE_FIELDS = [
  { key: 'title', label: 'Titel', type: 'string/text' },
  { key: 'content', label: 'Vollständiger Inhalt', type: 'string/textarea' },
  { key: 'phase', label: 'Aktuelle Phase', type: 'lookup/select', options: [{ key: 'discovery', label: 'Discovery' }, { key: 'codification', label: 'Codification' }, { key: 'dissemination', label: 'Dissemination' }, { key: 'application', label: 'Application' }, { key: 'archived', label: 'Archived' }] },
  { key: 'knowledge_type', label: 'Wissenstyp', type: 'lookup/select', options: [{ key: 'explicit', label: 'Explicit' }, { key: 'tacit_extracted', label: 'Tacit-extracted' }, { key: 'hybrid', label: 'Hybrid' }, { key: 'process', label: 'Process' }, { key: 'lesson_learned', label: 'Lesson Learned' }] },
  { key: 'quality_score', label: 'Qualitätsbewertung (Score)', type: 'number' },
  { key: 'ai_summary', label: 'KI-generierte Zusammenfassung', type: 'string/textarea' },
  { key: 'tacit_extraction_log', label: 'Log der Tacit-Knowledge-Extraktion', type: 'string/textarea' },
  { key: 'version', label: 'Version', type: 'string/text' },
  { key: 'author', label: 'Autor', type: 'applookup/select', targetEntity: 'benutzerrollen', targetAppId: 'BENUTZERROLLEN', displayField: 'firstname' },
  { key: 'curator', label: 'Kurator', type: 'applookup/select', targetEntity: 'benutzerrollen', targetAppId: 'BENUTZERROLLEN', displayField: 'firstname' },
  { key: 'ai_support', label: 'KI-Unterstützung aktiv', type: 'bool' },
  { key: 'last_modified', label: 'Zuletzt geändert am', type: 'date/datetimeminute' },
  { key: 'application_evidence', label: 'Anwendungsnachweise', type: 'string/textarea' },
  { key: 'attachment', label: 'Anhang / Dokument', type: 'file' },
];
const FEEDBACKUNDVERSIONEN_FIELDS = [
  { key: 'related_item', label: 'Bezug zu Wissensobjekt', type: 'applookup/select', targetEntity: 'wissensobjekte', targetAppId: 'WISSENSOBJEKTE', displayField: 'title' },
  { key: 'version_number', label: 'Version des Wissensobjekts', type: 'string/text' },
  { key: 'change_type', label: 'Art der Änderung', type: 'lookup/select', options: [{ key: 'edit', label: 'Edit' }, { key: 'feedback', label: 'Feedback' }, { key: 'statuswechsel', label: 'Statuswechsel' }, { key: 'ai_extraktion', label: 'AI-Extraktion' }] },
  { key: 'feedback_text', label: 'Feedback-Text / Inhalts-Snapshot', type: 'string/textarea' },
  { key: 'rating', label: 'Bewertung (Rating)', type: 'number' },
  { key: 'timestamp', label: 'Zeitstempel', type: 'date/datetimeminute' },
  { key: 'responsible_person', label: 'Verantwortliche Person', type: 'applookup/select', targetEntity: 'benutzerrollen', targetAppId: 'BENUTZERROLLEN', displayField: 'firstname' },
];
const WISSENSLANDKARTEN_FIELDS = [
  { key: 'map_title', label: 'Titel der Wissenslandkarte', type: 'string/text' },
  { key: 'map_type', label: 'Typ der Landkarte', type: 'lookup/select', options: [{ key: 'prozesslandkarte', label: 'Prozesslandkarte' }, { key: 'themen_cluster', label: 'Themen-Cluster' }, { key: 'wissensgraph', label: 'Wissensgraph' }, { key: 'mindmap', label: 'Mindmap' }] },
  { key: 'map_description', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'nodes_data', label: 'Nodes-Daten', type: 'string/textarea' },
  { key: 'edges_data', label: 'Edges-Daten', type: 'string/textarea' },
  { key: 'layout_data', label: 'Layout-Daten', type: 'string/textarea' },
  { key: 'map_creator', label: 'Erstellt von', type: 'applookup/select', targetEntity: 'benutzerrollen', targetAppId: 'BENUTZERROLLEN', displayField: 'firstname' },
  { key: 'map_created_at', label: 'Erstellungsdatum', type: 'date/datetimeminute' },
];
const BENUTZERROLLEN_FIELDS = [
  { key: 'firstname', label: 'Vorname', type: 'string/text' },
  { key: 'lastname', label: 'Nachname', type: 'string/text' },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'phone', label: 'Telefonnummer', type: 'string/tel' },
  { key: 'role', label: 'Rolle', type: 'lookup/select', options: [{ key: 'contributor', label: 'Contributor' }, { key: 'facilitator', label: 'Facilitator' }, { key: 'curator', label: 'Curator' }, { key: 'ai_support', label: 'AI-Support' }, { key: 'admin', label: 'Admin' }, { key: 'viewer', label: 'Viewer' }] },
  { key: 'department', label: 'Abteilung / Organisationseinheit', type: 'string/text' },
  { key: 'active', label: 'Aktiv', type: 'bool' },
];
const OBJEKTVERLINKUNGEN_FIELDS = [
  { key: 'item_from', label: 'Ausgangs-Wissensobjekt', type: 'applookup/select', targetEntity: 'wissensobjekte', targetAppId: 'WISSENSOBJEKTE', displayField: 'title' },
  { key: 'item_to', label: 'Ziel-Wissensobjekt', type: 'applookup/select', targetEntity: 'wissensobjekte', targetAppId: 'WISSENSOBJEKTE', displayField: 'title' },
  { key: 'link_type', label: 'Typ der Verknüpfung', type: 'lookup/select', options: [{ key: 'related', label: 'Related' }, { key: 'prerequisite', label: 'Prerequisite' }, { key: 'extends', label: 'Extends' }, { key: 'see_also', label: 'See Also' }] },
  { key: 'link_strength', label: 'Stärke der Beziehung (optional)', type: 'number' },
  { key: 'il_created_at', label: 'Erstellungszeitpunkt', type: 'date/datetimeminute' },
  { key: 'il_created_by', label: 'Erstellt von', type: 'applookup/select', targetEntity: 'benutzerrollen', targetAppId: 'BENUTZERROLLEN', displayField: 'firstname' },
  { key: 'link_justification', label: 'Begründung der Verlinkung (optional)', type: 'string/textarea' },
];
const OBJEKTFEEDBACKZUORDNUNG_FIELDS = [
  { key: 'if_knowledge_item', label: 'Wissensobjekt', type: 'applookup/select', targetEntity: 'wissensobjekte', targetAppId: 'WISSENSOBJEKTE', displayField: 'title' },
  { key: 'if_feedback_version', label: 'Feedback / Version', type: 'applookup/select', targetEntity: 'feedback_und_versionen', targetAppId: 'FEEDBACK_UND_VERSIONEN', displayField: 'version_number' },
  { key: 'if_giver_role', label: 'Rolle des Feedback-Gebers im Kontext dieses Objekts', type: 'lookup/select', options: [{ key: 'contributor', label: 'Contributor' }, { key: 'facilitator', label: 'Facilitator' }, { key: 'curator', label: 'Curator' }, { key: 'ai_support', label: 'AI-Support' }, { key: 'admin', label: 'Admin' }, { key: 'viewer', label: 'Viewer' }] },
];

const ENTITY_TABS = [
  { key: 'karten_knoten', label: 'Karten-Knoten', pascal: 'KartenKnoten' },
  { key: 'wissensobjekte', label: 'Wissensobjekte', pascal: 'Wissensobjekte' },
  { key: 'feedback_und_versionen', label: 'Feedback und Versionen', pascal: 'FeedbackUndVersionen' },
  { key: 'wissenslandkarten', label: 'Wissenslandkarten', pascal: 'Wissenslandkarten' },
  { key: 'benutzerrollen', label: 'Benutzerrollen', pascal: 'Benutzerrollen' },
  { key: 'objekt_verlinkungen', label: 'Objekt-Verlinkungen', pascal: 'ObjektVerlinkungen' },
  { key: 'objekt_feedback_zuordnung', label: 'Objekt-Feedback-Zuordnung', pascal: 'ObjektFeedbackZuordnung' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('karten_knoten');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'karten_knoten': new Set(),
    'wissensobjekte': new Set(),
    'feedback_und_versionen': new Set(),
    'wissenslandkarten': new Set(),
    'benutzerrollen': new Set(),
    'objekt_verlinkungen': new Set(),
    'objekt_feedback_zuordnung': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'karten_knoten': {},
    'wissensobjekte': {},
    'feedback_und_versionen': {},
    'wissenslandkarten': {},
    'benutzerrollen': {},
    'objekt_verlinkungen': {},
    'objekt_feedback_zuordnung': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'karten_knoten': return (data as any).kartenKnoten as KartenKnoten[] ?? [];
      case 'wissensobjekte': return (data as any).wissensobjekte as Wissensobjekte[] ?? [];
      case 'feedback_und_versionen': return (data as any).feedbackUndVersionen as FeedbackUndVersionen[] ?? [];
      case 'wissenslandkarten': return (data as any).wissenslandkarten as Wissenslandkarten[] ?? [];
      case 'benutzerrollen': return (data as any).benutzerrollen as Benutzerrollen[] ?? [];
      case 'objekt_verlinkungen': return (data as any).objektVerlinkungen as ObjektVerlinkungen[] ?? [];
      case 'objekt_feedback_zuordnung': return (data as any).objektFeedbackZuordnung as ObjektFeedbackZuordnung[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'karten_knoten':
        lists.wissenslandkartenList = (data as any).wissenslandkarten ?? [];
        lists.wissensobjekteList = (data as any).wissensobjekte ?? [];
        lists.benutzerrollenList = (data as any).benutzerrollen ?? [];
        break;
      case 'wissensobjekte':
        lists.benutzerrollenList = (data as any).benutzerrollen ?? [];
        break;
      case 'feedback_und_versionen':
        lists.wissensobjekteList = (data as any).wissensobjekte ?? [];
        lists.benutzerrollenList = (data as any).benutzerrollen ?? [];
        break;
      case 'wissenslandkarten':
        lists.benutzerrollenList = (data as any).benutzerrollen ?? [];
        break;
      case 'objekt_verlinkungen':
        lists.wissensobjekteList = (data as any).wissensobjekte ?? [];
        lists.benutzerrollenList = (data as any).benutzerrollen ?? [];
        break;
      case 'objekt_feedback_zuordnung':
        lists.wissensobjekteList = (data as any).wissensobjekte ?? [];
        lists.feedback_und_versionenList = (data as any).feedbackUndVersionen ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'karten_knoten' && fieldKey === 'mn_map') {
      const match = (lists.wissenslandkartenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.map_title ?? '—';
    }
    if (entity === 'karten_knoten' && fieldKey === 'mn_item') {
      const match = (lists.wissensobjekteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.title ?? '—';
    }
    if (entity === 'karten_knoten' && fieldKey === 'mn_added_by') {
      const match = (lists.benutzerrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firstname ?? '—';
    }
    if (entity === 'wissensobjekte' && fieldKey === 'author') {
      const match = (lists.benutzerrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firstname ?? '—';
    }
    if (entity === 'wissensobjekte' && fieldKey === 'curator') {
      const match = (lists.benutzerrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firstname ?? '—';
    }
    if (entity === 'feedback_und_versionen' && fieldKey === 'related_item') {
      const match = (lists.wissensobjekteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.title ?? '—';
    }
    if (entity === 'feedback_und_versionen' && fieldKey === 'responsible_person') {
      const match = (lists.benutzerrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firstname ?? '—';
    }
    if (entity === 'wissenslandkarten' && fieldKey === 'map_creator') {
      const match = (lists.benutzerrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firstname ?? '—';
    }
    if (entity === 'objekt_verlinkungen' && fieldKey === 'item_from') {
      const match = (lists.wissensobjekteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.title ?? '—';
    }
    if (entity === 'objekt_verlinkungen' && fieldKey === 'item_to') {
      const match = (lists.wissensobjekteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.title ?? '—';
    }
    if (entity === 'objekt_verlinkungen' && fieldKey === 'il_created_by') {
      const match = (lists.benutzerrollenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.firstname ?? '—';
    }
    if (entity === 'objekt_feedback_zuordnung' && fieldKey === 'if_knowledge_item') {
      const match = (lists.wissensobjekteList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.title ?? '—';
    }
    if (entity === 'objekt_feedback_zuordnung' && fieldKey === 'if_feedback_version') {
      const match = (lists.feedback_und_versionenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.version_number ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'karten_knoten': return KARTENKNOTEN_FIELDS;
      case 'wissensobjekte': return WISSENSOBJEKTE_FIELDS;
      case 'feedback_und_versionen': return FEEDBACKUNDVERSIONEN_FIELDS;
      case 'wissenslandkarten': return WISSENSLANDKARTEN_FIELDS;
      case 'benutzerrollen': return BENUTZERROLLEN_FIELDS;
      case 'objekt_verlinkungen': return OBJEKTVERLINKUNGEN_FIELDS;
      case 'objekt_feedback_zuordnung': return OBJEKTFEEDBACKZUORDNUNG_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'karten_knoten': return {
        create: (fields: any) => LivingAppsService.createKartenKnotenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKartenKnotenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKartenKnotenEntry(id),
      };
      case 'wissensobjekte': return {
        create: (fields: any) => LivingAppsService.createWissensobjekteEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateWissensobjekteEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteWissensobjekteEntry(id),
      };
      case 'feedback_und_versionen': return {
        create: (fields: any) => LivingAppsService.createFeedbackUndVersionenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateFeedbackUndVersionenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteFeedbackUndVersionenEntry(id),
      };
      case 'wissenslandkarten': return {
        create: (fields: any) => LivingAppsService.createWissenslandkartenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateWissenslandkartenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteWissenslandkartenEntry(id),
      };
      case 'benutzerrollen': return {
        create: (fields: any) => LivingAppsService.createBenutzerrollenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateBenutzerrollenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteBenutzerrollenEntry(id),
      };
      case 'objekt_verlinkungen': return {
        create: (fields: any) => LivingAppsService.createObjektVerlinkungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateObjektVerlinkungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteObjektVerlinkungenEntry(id),
      };
      case 'objekt_feedback_zuordnung': return {
        create: (fields: any) => LivingAppsService.createObjektFeedbackZuordnungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateObjektFeedbackZuordnungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteObjektFeedbackZuordnungEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'karten_knoten' || dialogState?.entity === 'karten_knoten') && (
        <KartenKnotenDialog
          open={createEntity === 'karten_knoten' || dialogState?.entity === 'karten_knoten'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'karten_knoten' ? handleUpdate : (fields: any) => handleCreate('karten_knoten', fields)}
          defaultValues={dialogState?.entity === 'karten_knoten' ? dialogState.record?.fields : undefined}
          wissenslandkartenList={(data as any).wissenslandkarten ?? []}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['KartenKnoten']}
          enablePhotoLocation={AI_PHOTO_LOCATION['KartenKnoten']}
        />
      )}
      {(createEntity === 'wissensobjekte' || dialogState?.entity === 'wissensobjekte') && (
        <WissensobjekteDialog
          open={createEntity === 'wissensobjekte' || dialogState?.entity === 'wissensobjekte'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'wissensobjekte' ? handleUpdate : (fields: any) => handleCreate('wissensobjekte', fields)}
          defaultValues={dialogState?.entity === 'wissensobjekte' ? dialogState.record?.fields : undefined}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Wissensobjekte']}
        />
      )}
      {(createEntity === 'feedback_und_versionen' || dialogState?.entity === 'feedback_und_versionen') && (
        <FeedbackUndVersionenDialog
          open={createEntity === 'feedback_und_versionen' || dialogState?.entity === 'feedback_und_versionen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'feedback_und_versionen' ? handleUpdate : (fields: any) => handleCreate('feedback_und_versionen', fields)}
          defaultValues={dialogState?.entity === 'feedback_und_versionen' ? dialogState.record?.fields : undefined}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['FeedbackUndVersionen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['FeedbackUndVersionen']}
        />
      )}
      {(createEntity === 'wissenslandkarten' || dialogState?.entity === 'wissenslandkarten') && (
        <WissenslandkartenDialog
          open={createEntity === 'wissenslandkarten' || dialogState?.entity === 'wissenslandkarten'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'wissenslandkarten' ? handleUpdate : (fields: any) => handleCreate('wissenslandkarten', fields)}
          defaultValues={dialogState?.entity === 'wissenslandkarten' ? dialogState.record?.fields : undefined}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Wissenslandkarten']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Wissenslandkarten']}
        />
      )}
      {(createEntity === 'benutzerrollen' || dialogState?.entity === 'benutzerrollen') && (
        <BenutzerrollenDialog
          open={createEntity === 'benutzerrollen' || dialogState?.entity === 'benutzerrollen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'benutzerrollen' ? handleUpdate : (fields: any) => handleCreate('benutzerrollen', fields)}
          defaultValues={dialogState?.entity === 'benutzerrollen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Benutzerrollen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Benutzerrollen']}
        />
      )}
      {(createEntity === 'objekt_verlinkungen' || dialogState?.entity === 'objekt_verlinkungen') && (
        <ObjektVerlinkungenDialog
          open={createEntity === 'objekt_verlinkungen' || dialogState?.entity === 'objekt_verlinkungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'objekt_verlinkungen' ? handleUpdate : (fields: any) => handleCreate('objekt_verlinkungen', fields)}
          defaultValues={dialogState?.entity === 'objekt_verlinkungen' ? dialogState.record?.fields : undefined}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['ObjektVerlinkungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['ObjektVerlinkungen']}
        />
      )}
      {(createEntity === 'objekt_feedback_zuordnung' || dialogState?.entity === 'objekt_feedback_zuordnung') && (
        <ObjektFeedbackZuordnungDialog
          open={createEntity === 'objekt_feedback_zuordnung' || dialogState?.entity === 'objekt_feedback_zuordnung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'objekt_feedback_zuordnung' ? handleUpdate : (fields: any) => handleCreate('objekt_feedback_zuordnung', fields)}
          defaultValues={dialogState?.entity === 'objekt_feedback_zuordnung' ? dialogState.record?.fields : undefined}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          feedback_und_versionenList={(data as any).feedbackUndVersionen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['ObjektFeedbackZuordnung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['ObjektFeedbackZuordnung']}
        />
      )}
      {viewState?.entity === 'karten_knoten' && (
        <KartenKnotenViewDialog
          open={viewState?.entity === 'karten_knoten'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'karten_knoten', record: r }); }}
          wissenslandkartenList={(data as any).wissenslandkarten ?? []}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
        />
      )}
      {viewState?.entity === 'wissensobjekte' && (
        <WissensobjekteViewDialog
          open={viewState?.entity === 'wissensobjekte'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'wissensobjekte', record: r }); }}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
        />
      )}
      {viewState?.entity === 'feedback_und_versionen' && (
        <FeedbackUndVersionenViewDialog
          open={viewState?.entity === 'feedback_und_versionen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'feedback_und_versionen', record: r }); }}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
        />
      )}
      {viewState?.entity === 'wissenslandkarten' && (
        <WissenslandkartenViewDialog
          open={viewState?.entity === 'wissenslandkarten'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'wissenslandkarten', record: r }); }}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
        />
      )}
      {viewState?.entity === 'benutzerrollen' && (
        <BenutzerrollenViewDialog
          open={viewState?.entity === 'benutzerrollen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'benutzerrollen', record: r }); }}
        />
      )}
      {viewState?.entity === 'objekt_verlinkungen' && (
        <ObjektVerlinkungenViewDialog
          open={viewState?.entity === 'objekt_verlinkungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'objekt_verlinkungen', record: r }); }}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          benutzerrollenList={(data as any).benutzerrollen ?? []}
        />
      )}
      {viewState?.entity === 'objekt_feedback_zuordnung' && (
        <ObjektFeedbackZuordnungViewDialog
          open={viewState?.entity === 'objekt_feedback_zuordnung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'objekt_feedback_zuordnung', record: r }); }}
          wissensobjekteList={(data as any).wissensobjekte ?? []}
          feedback_und_versionenList={(data as any).feedbackUndVersionen ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}