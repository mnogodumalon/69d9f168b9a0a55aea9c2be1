import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWissensobjekte } from '@/lib/enrich';
import type { EnrichedWissensobjekte } from '@/types/enriched';
import type { Wissensobjekte, Wissenslandkarten, KartenKnoten, ObjektVerlinkungen } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash,
  IconBulb, IconBook, IconShare, IconRocket, IconArchive, IconUsers, IconMap,
  IconStar, IconTrendingUp, IconSearch, IconChevronRight, IconNetwork,
  IconChevronDown, IconChevronLeft, IconExternalLink, IconFile, IconPhoto, IconX
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const APPGROUP_ID = '69d9f168b9a0a55aea9c2be1';
const REPAIR_ENDPOINT = '/claude/build/repair';

const SVG_W = 800;
const SVG_H = 380;
const PADDING = 64;
const NODE_R = 22;

const PHASES = [
  { key: 'discovery', label: 'Discovery', icon: IconBulb, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { key: 'codification', label: 'Codification', icon: IconBook, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { key: 'dissemination', label: 'Dissemination', icon: IconShare, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  { key: 'application', label: 'Application', icon: IconRocket, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  { key: 'archived', label: 'Archived', icon: IconArchive, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/30', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
];

const PHASE_NODE_COLORS: Record<string, string> = {
  discovery: '#f59e0b',
  codification: '#3b82f6',
  dissemination: '#8b5cf6',
  application: '#10b981',
  archived: '#9ca3af',
};

const LINK_TYPE_STYLES: Record<string, { color: string; dashed: boolean }> = {
  related: { color: '#94a3b8', dashed: false },
  prerequisite: { color: '#ef4444', dashed: false },
  extends: { color: '#8b5cf6', dashed: false },
  see_also: { color: '#f59e0b', dashed: true },
};

const KNOWLEDGE_TYPE_COLORS: Record<string, string> = {
  explicit: 'bg-sky-100 text-sky-700',
  tacit_extracted: 'bg-purple-100 text-purple-700',
  hybrid: 'bg-orange-100 text-orange-700',
  process: 'bg-teal-100 text-teal-700',
  lesson_learned: 'bg-rose-100 text-rose-700',
};

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

export default function DashboardOverview() {
  const {
    benutzerrollen, wissensobjekte, wissenslandkarten,
    kartenKnoten, objektVerlinkungen,
    benutzerrollenMap, wissensobjekteMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedWissensobjekte = enrichWissensobjekte(wissensobjekte, { benutzerrollenMap });

  // --- ALL HOOKS BEFORE EARLY RETURNS ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedWissensobjekte | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedWissensobjekte | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return enrichedWissensobjekte.filter(item => {
      const matchSearch = !searchQuery ||
        item.fields.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.authorName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [enrichedWissensobjekte, searchQuery]);

  const byPhase = useMemo(() => {
    const map: Record<string, EnrichedWissensobjekte[]> = {};
    for (const phase of PHASES) map[phase.key] = [];
    for (const item of filteredItems) {
      const key = item.fields.phase?.key ?? 'discovery';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [filteredItems]);

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [phasePages, setPhasePages] = useState<Record<string, number>>({});

  const activeItems = useMemo(() => enrichedWissensobjekte.filter(i => i.fields.phase?.key !== 'archived'), [enrichedWissensobjekte]);
  const avgQuality = useMemo(() => {
    const withScore = enrichedWissensobjekte.filter(i => i.fields.quality_score != null);
    if (!withScore.length) return 0;
    return Math.round(withScore.reduce((s, i) => s + (i.fields.quality_score ?? 0), 0) / withScore.length);
  }, [enrichedWissensobjekte]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCreate = async (fields: EnrichedWissensobjekte['fields']) => {
    await LivingAppsService.createWissensobjekteEntry(fields as any);
    fetchAll();
  };

  const handleEdit = async (fields: EnrichedWissensobjekte['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateWissensobjekteEntry(editRecord.record_id, fields as any);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteWissensobjekteEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const visiblePhases = selectedPhase
    ? PHASES.filter(p => p.key === selectedPhase)
    : PHASES;

  return (
    <div className="space-y-6">
      {/* Intent Workflows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/wissensobjekt-kuratieren" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 min-w-0 overflow-hidden">
          <IconStar size={20} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">Wissensobjekt kuratieren</div>
            <div className="text-xs text-muted-foreground line-clamp-2">Objekt prüfen, Feedback geben, Verlinkungen erstellen und Phase weitersetzen</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/wissenslandkarte-befuellen" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 min-w-0 overflow-hidden">
          <IconMap size={20} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">Wissenslandkarte befüllen</div>
            <div className="text-xs text-muted-foreground line-clamp-2">Karte auswählen, Knoten hinzufügen und Verlinkungen zwischen Wissensobjekten definieren</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Wissensobjekte"
          value={String(wissensobjekte.length)}
          description="Gesamt"
          icon={<IconBook size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktiv"
          value={String(activeItems.length)}
          description="Nicht archiviert"
          icon={<IconTrendingUp size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ø Qualität"
          value={avgQuality > 0 ? String(avgQuality) : '—'}
          description="Durchschnitt"
          icon={<IconStar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Wissenskarten"
          value={String(wissenslandkarten.length)}
          description="Landkarten"
          icon={<IconMap size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <IconSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedPhase(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedPhase === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Alle
          </button>
          {PHASES.map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedPhase(prev => prev === p.key ? null : p.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedPhase === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {p.label} <span className="ml-1 opacity-70">{byPhase[p.key]?.length ?? 0}</span>
            </button>
          ))}
        </div>

        <Button size="sm" className="ml-auto shrink-0" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
          <IconPlus size={15} className="mr-1 shrink-0" />
          <span className="hidden sm:inline">Neues Objekt</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>

      {/* Kanban Board */}
      <div className={`grid gap-4 ${visiblePhases.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5'}`}>
        {visiblePhases.map(phase => {
          const PhaseIcon = phase.icon;
          const items = byPhase[phase.key] ?? [];
          const isOpen = expandedPhases.has(phase.key);
          const page = phasePages[phase.key] ?? 0;
          const PAGE_SIZE = 5;
          const totalPages = Math.ceil(items.length / PAGE_SIZE);
          const pageItems = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

          const togglePhase = () => {
            setExpandedPhases(prev => {
              const next = new Set(prev);
              if (next.has(phase.key)) next.delete(phase.key);
              else next.add(phase.key);
              return next;
            });
          };

          const setPage = (p: number) =>
            setPhasePages(prev => ({ ...prev, [phase.key]: p }));

          return (
            <div key={phase.key} className={`rounded-2xl border ${phase.border} ${phase.bg} overflow-hidden flex flex-col`}>
              {/* Clickable Header */}
              <button
                onClick={togglePhase}
                className="flex items-center gap-2 px-4 py-3 w-full text-left hover:brightness-95 transition-all"
              >
                <PhaseIcon size={16} className={`${phase.color} shrink-0`} />
                <span className="font-semibold text-sm text-foreground truncate">{phase.label}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${phase.badge}`}>
                  {items.length}
                </span>
                <IconChevronDown
                  size={14}
                  className={`ml-auto text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Collapsible Content */}
              {isOpen && (
                <>
                  <div className="flex flex-col gap-2 p-3 border-t border-inherit">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <PhaseIcon size={28} className="opacity-25 mb-2" stroke={1.5} />
                        <span className="text-xs">Keine Einträge</span>
                      </div>
                    ) : (
                      pageItems.map(item => (
                        <KnowledgeCard
                          key={item.record_id}
                          item={item}
                          onEdit={() => { setEditRecord(item); setDialogOpen(true); }}
                          onDelete={() => setDeleteTarget(item)}
                        />
                      ))
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-inherit">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="p-1 rounded hover:bg-background/60 disabled:opacity-30 transition-colors"
                      >
                        <IconChevronLeft size={14} className="text-muted-foreground" />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-1 rounded hover:bg-background/60 disabled:opacity-30 transition-colors"
                      >
                        <IconChevronDown size={14} className="text-muted-foreground -rotate-90" />
                      </button>
                    </div>
                  )}

                  {/* Add in column */}
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => { setEditRecord(null); setDialogOpen(true); }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-background/60 transition-colors"
                    >
                      <IconPlus size={13} className="shrink-0" />
                      Hinzufügen
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Wissenslandkarte Visualisierung */}
      <KnowledgeMapVisualization
        wissenslandkarten={wissenslandkarten}
        kartenKnoten={kartenKnoten}
        objektVerlinkungen={objektVerlinkungen}
        wissensobjekteMap={wissensobjekteMap}
      />

      {/* Authors */}
      <div className="rounded-2xl border bg-card p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <IconUsers size={16} className="text-muted-foreground shrink-0" />
          <h3 className="font-semibold text-sm">Autoren & Beiträge</h3>
        </div>
        {benutzerrollen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Benutzer</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {benutzerrollen.slice(0, 6).map(user => {
              const contributions = wissensobjekte.filter(w =>
                extractRecordId(w.fields.author) === user.record_id
              ).length;
              return (
                <div key={user.record_id} className="flex items-center gap-3 min-w-0 rounded-xl border p-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {(user.fields.firstname?.[0] ?? user.fields.lastname?.[0] ?? '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {[user.fields.firstname, user.fields.lastname].filter(Boolean).join(' ') || user.fields.email || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.fields.role?.label ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold">{contributions}</span>
                    <p className="text-xs text-muted-foreground">Obj.</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <WissensobjekteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        benutzerrollenList={benutzerrollen}
        enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Wissensobjekt löschen"
        description={`Möchtest du "${deleteTarget?.fields.title ?? 'dieses Objekt'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Wissenslandkarte Graph Visualisierung ───────────────────────────────────

function KnowledgeMapVisualization({
  wissenslandkarten,
  kartenKnoten,
  objektVerlinkungen,
  wissensobjekteMap,
}: {
  wissenslandkarten: Wissenslandkarten[];
  kartenKnoten: KartenKnoten[];
  objektVerlinkungen: ObjektVerlinkungen[];
  wissensobjekteMap: Map<string, Wissensobjekte>;
}) {
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailNode, setDetailNode] = useState<{ kn: KartenKnoten; obj: Wissensobjekte; objId: string } | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);

  const effectiveMapId = selectedMapId || wissenslandkarten[0]?.record_id || '';
  const selectedMap = wissenslandkarten.find(m => m.record_id === effectiveMapId);

  const mapNodes = useMemo(
    () => kartenKnoten.filter(kn => extractRecordId(kn.fields.mn_map) === effectiveMapId),
    [kartenKnoten, effectiveMapId]
  );

  const nodeData = useMemo(() => {
    return mapNodes.map(kn => {
      const objId = extractRecordId(kn.fields.mn_item);
      const obj = objId ? wissensobjekteMap.get(objId) : undefined;
      return { kn, obj, objId };
    }).filter((n): n is { kn: KartenKnoten; obj: Wissensobjekte; objId: string } => !!n.obj && !!n.objId);
  }, [mapNodes, wissensobjekteMap]);

  const nodeObjIds = useMemo(() => new Set(nodeData.map(n => n.objId)), [nodeData]);

  const edges = useMemo(() =>
    objektVerlinkungen.filter(e => {
      const from = extractRecordId(e.fields.item_from);
      const to = extractRecordId(e.fields.item_to);
      return !!from && !!to && nodeObjIds.has(from) && nodeObjIds.has(to);
    }),
    [objektVerlinkungen, nodeObjIds]
  );

  const positions = useMemo(() => {
    const n = nodeData.length;
    const posMap = new Map<string, { x: number; y: number }>();
    if (n === 0) return posMap;

    const hasPos = nodeData.some(d => d.kn.fields.pos_x != null && d.kn.fields.pos_y != null);

    if (hasPos) {
      const xs = nodeData.map(d => d.kn.fields.pos_x ?? 0);
      const ys = nodeData.map(d => d.kn.fields.pos_y ?? 0);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;
      nodeData.forEach(d => {
        posMap.set(d.objId, {
          x: ((d.kn.fields.pos_x ?? 0) - minX) / rangeX * (SVG_W - 2 * PADDING) + PADDING,
          y: ((d.kn.fields.pos_y ?? 0) - minY) / rangeY * (SVG_H - 2 * PADDING) + PADDING,
        });
      });
    } else {
      const cx = SVG_W / 2, cy = SVG_H / 2;
      const r = Math.min(SVG_W, SVG_H) / 2 - PADDING - NODE_R;
      nodeData.forEach((d, i) => {
        const angle = n === 1 ? 0 : (i / n) * 2 * Math.PI - Math.PI / 2;
        posMap.set(d.objId, {
          x: n === 1 ? cx : cx + r * Math.cos(angle),
          y: n === 1 ? cy : cy + r * Math.sin(angle),
        });
      });
    }
    return posMap;
  }, [nodeData]);

  const selectedNode = selectedNodeId ? nodeData.find(n => n.objId === selectedNodeId) ?? null : null;
  const selectedNodeConnections = useMemo(() =>
    selectedNodeId ? edges.filter(e => {
      const from = extractRecordId(e.fields.item_from);
      const to = extractRecordId(e.fields.item_to);
      return from === selectedNodeId || to === selectedNodeId;
    }) : [],
    [edges, selectedNodeId]
  );

  const activePhasesInMap = useMemo(() =>
    PHASES.filter(p => nodeData.some(n => n.obj.fields.phase?.key === p.key)),
    [nodeData]
  );

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b">
        <IconNetwork size={16} className="text-muted-foreground shrink-0" />
        <h3 className="font-semibold text-sm">Wissenslandkarte</h3>
        {wissenslandkarten.length > 1 && (
          <select
            value={effectiveMapId}
            onChange={e => { setSelectedMapId(e.target.value); setSelectedNodeId(null); }}
            className="ml-auto text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[220px] truncate"
          >
            {wissenslandkarten.map(m => (
              <option key={m.record_id} value={m.record_id}>
                {m.fields.map_title ?? 'Unbenannte Karte'}{m.fields.map_type ? ` · ${m.fields.map_type.label}` : ''}
              </option>
            ))}
          </select>
        )}
        {wissenslandkarten.length === 1 && selectedMap && (
          <div className="ml-auto flex items-center gap-2">
            {selectedMap.fields.map_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {selectedMap.fields.map_type.label}
              </span>
            )}
            <span className="text-sm font-medium truncate max-w-[180px]">{selectedMap.fields.map_title ?? '—'}</span>
          </div>
        )}
      </div>

      {wissenslandkarten.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <IconNetwork size={48} className="opacity-20 mb-3" stroke={1.5} />
          <p className="text-sm">Noch keine Wissenslandkarten angelegt</p>
        </div>
      ) : nodeData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <IconMap size={48} className="opacity-20 mb-3" stroke={1.5} />
          <p className="text-sm font-medium">{selectedMap?.fields.map_title ?? 'Karte'}</p>
          <p className="text-xs mt-1">Noch keine Knoten in dieser Landkarte</p>
          {selectedMap?.fields.map_description && (
            <p className="text-xs mt-2 max-w-xs text-center opacity-70">{selectedMap.fields.map_description}</p>
          )}
        </div>
      ) : (
        <div>
          {/* SVG Canvas — full width */}
          <div className="bg-muted/10 relative overflow-hidden">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ height: '380px', display: 'block' }}
            >
              {/* Edge lines */}
              {edges.map(e => {
                const fromId = extractRecordId(e.fields.item_from);
                const toId = extractRecordId(e.fields.item_to);
                if (!fromId || !toId) return null;
                const p1 = positions.get(fromId);
                const p2 = positions.get(toId);
                if (!p1 || !p2) return null;
                const typeKey = e.fields.link_type?.key ?? 'related';
                const style = LINK_TYPE_STYLES[typeKey] ?? LINK_TYPE_STYLES.related;
                const strength = Math.max(1, Math.min(4, e.fields.link_strength ?? 1));
                const isHighlighted = selectedNodeId === fromId || selectedNodeId === toId;
                return (
                  <line
                    key={e.record_id}
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke={style.color}
                    strokeWidth={isHighlighted ? strength + 1.5 : strength}
                    strokeOpacity={selectedNodeId ? (isHighlighted ? 0.85 : 0.2) : 0.45}
                    strokeDasharray={style.dashed ? '7,4' : undefined}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Arrowhead markers */}
              <defs>
                {Object.entries(LINK_TYPE_STYLES).map(([key, s]) => (
                  <marker
                    key={key}
                    id={`arrow-${key}`}
                    markerWidth="8" markerHeight="8"
                    refX="6" refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L8,3 z" fill={s.color} fillOpacity={0.6} />
                  </marker>
                ))}
              </defs>

              {/* Nodes */}
              {nodeData.map(({ kn, obj, objId }) => {
                const pos = positions.get(objId);
                if (!pos) return null;
                const phaseKey = obj.fields.phase?.key ?? 'discovery';
                const color = PHASE_NODE_COLORS[phaseKey] ?? '#94a3b8';
                const isSelected = selectedNodeId === objId;
                const isDimmed = selectedNodeId !== null && !isSelected && !selectedNodeConnections.some(e => {
                  const from = extractRecordId(e.fields.item_from);
                  const to = extractRecordId(e.fields.item_to);
                  return from === objId || to === objId;
                });
                const label = kn.fields.node_label || obj.fields.title || '—';
                const shortLabel = label.length > 18 ? label.slice(0, 16) + '…' : label;

                return (
                  <g
                    key={objId}
                    transform={`translate(${pos.x},${pos.y})`}
                    onClick={() => setSelectedNodeId(prev => prev === objId ? null : objId)}
                    style={{ cursor: 'pointer' }}
                    opacity={isDimmed ? 0.3 : 1}
                  >
                    {/* Selection ring */}
                    {isSelected && (
                      <circle r={NODE_R + 8} fill={color} fillOpacity={0.15} />
                    )}
                    {/* Main circle */}
                    <circle
                      r={NODE_R}
                      fill={color}
                      fillOpacity={isSelected ? 1 : 0.82}
                      stroke="white"
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    {/* Quality score inside */}
                    {obj.fields.quality_score != null && (
                      <text
                        textAnchor="middle"
                        dy="0.35em"
                        fontSize={11}
                        fontWeight="700"
                        fill="white"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {obj.fields.quality_score}
                      </text>
                    )}
                    {/* Label below */}
                    <text
                      textAnchor="middle"
                      y={NODE_R + 16}
                      fontSize={10}
                      fontWeight={isSelected ? '700' : '500'}
                      fill={isSelected ? color : '#64748b'}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hint — only when nothing selected */}
            {!selectedNodeId && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
                <span className="text-[11px] text-muted-foreground bg-card/90 px-3 py-1 rounded-full border border-border/60 shadow-sm">
                  Knoten anklicken für Details
                </span>
              </div>
            )}
          </div>

          {/* ── Node Info Card — erscheint nach Klick ── */}
          {selectedNode && (() => {
            const phaseInfo = PHASES.find(p => p.key === selectedNode.obj.fields.phase?.key);
            const phaseColor = PHASE_NODE_COLORS[selectedNode.obj.fields.phase?.key ?? ''] ?? '#94a3b8';
            return (
              <div className="border-t" style={{ borderColor: phaseColor + '55' }}>
                <div className="p-4" style={{ background: phaseColor + '0d' }}>
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: phaseColor }} />
                      <button
                        className="font-bold text-base leading-snug truncate text-left hover:underline hover:text-primary transition-colors min-w-0"
                        title="Details anzeigen"
                        onClick={() => { setDetailNode(selectedNode); setImageExpanded(false); }}
                      >
                        {selectedNode.obj.fields.title ?? '—'}
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="shrink-0 text-muted-foreground hover:text-foreground w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                      title="Schließen"
                    >
                      <IconX size={14} />
                    </button>
                  </div>

                  {/* Badge row */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {phaseInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseInfo.badge}`}>
                        {phaseInfo.label}
                      </span>
                    )}
                    {selectedNode.obj.fields.knowledge_type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KNOWLEDGE_TYPE_COLORS[selectedNode.obj.fields.knowledge_type.key] ?? 'bg-muted text-muted-foreground'}`}>
                        {selectedNode.obj.fields.knowledge_type.label}
                      </span>
                    )}
                    {selectedNode.obj.fields.ai_support && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                        AI-unterstützt
                      </span>
                    )}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg bg-card border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Qualität</p>
                      <p className="text-lg font-bold">
                        {selectedNode.obj.fields.quality_score != null
                          ? `★ ${selectedNode.obj.fields.quality_score}`
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </p>
                    </div>
                    <div className="rounded-lg bg-card border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Version</p>
                      <p className="text-sm font-semibold truncate">
                        {selectedNode.obj.fields.version ?? <span className="text-muted-foreground">—</span>}
                      </p>
                    </div>
                    <div className="rounded-lg bg-card border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Verbindungen</p>
                      <p className="text-lg font-bold">{selectedNodeConnections.length}</p>
                    </div>
                    <div className="rounded-lg bg-card border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Geändert</p>
                      <p className="text-sm font-semibold truncate">
                        {selectedNode.obj.fields.last_modified
                          ? formatDate(selectedNode.obj.fields.last_modified)
                          : <span className="text-muted-foreground">—</span>}
                      </p>
                    </div>
                  </div>

                  {/* AI Summary / Content */}
                  {(selectedNode.obj.fields.ai_summary || selectedNode.obj.fields.content) && (
                    <div className="rounded-lg bg-card border p-3 mb-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        {selectedNode.obj.fields.ai_summary ? 'KI-Zusammenfassung' : 'Inhalt'}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                        {selectedNode.obj.fields.ai_summary ?? selectedNode.obj.fields.content}
                      </p>
                    </div>
                  )}

                  {/* Connected nodes */}
                  {selectedNodeConnections.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                        Verbundene Wissensobjekte
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedNodeConnections.map(e => {
                          const fromId = extractRecordId(e.fields.item_from);
                          const toId = extractRecordId(e.fields.item_to);
                          const otherId = fromId === selectedNodeId ? toId : fromId;
                          const otherNode = otherId ? nodeData.find(n => n.objId === otherId) : null;
                          const linkStyle = LINK_TYPE_STYLES[e.fields.link_type?.key ?? 'related'] ?? LINK_TYPE_STYLES.related;
                          return (
                            <button
                              key={e.record_id}
                              onClick={() => otherId && setSelectedNodeId(otherId)}
                              className="flex items-center gap-1.5 text-xs bg-card border rounded-full px-2.5 py-1 hover:bg-accent transition-colors"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: linkStyle.color }}
                              />
                              <span className="truncate max-w-[120px]">
                                {otherNode?.obj.fields.title ?? '—'}
                              </span>
                              <span className="text-muted-foreground text-[10px] shrink-0">
                                {e.fields.link_type?.label ?? 'Related'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Legende ── */}
          <div className="border-t px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5 items-center bg-muted/5">
            {activePhasesInMap.map(p => (
              <div key={p.key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PHASE_NODE_COLORS[p.key] }} />
                <span className="text-xs text-muted-foreground">{p.label} ({nodeData.filter(n => n.obj.fields.phase?.key === p.key).length})</span>
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              {nodeData.length} Knoten · {edges.length} Verbindungen
            </span>
          </div>
        </div>
      )}

      {/* ── Detail-Dialog ── */}
      {detailNode && (() => {
        const obj = detailNode.obj;
        const phaseInfo = PHASES.find(p => p.key === obj.fields.phase?.key);
        const phaseColor = PHASE_NODE_COLORS[obj.fields.phase?.key ?? ''] ?? '#94a3b8';
        const attachment = obj.fields.attachment;
        return (
          <Dialog open={!!detailNode} onOpenChange={(o) => { if (!o) { setDetailNode(null); setImageExpanded(false); } }}>
            <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
              {/* Header */}
              <div className="px-5 py-4 border-b" style={{ borderColor: phaseColor + '44', background: phaseColor + '12' }}>
                <DialogHeader>
                  <div className="flex items-center gap-2 pr-6">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: phaseColor }} />
                    <DialogTitle className="text-base leading-snug">{obj.fields.title ?? '—'}</DialogTitle>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {phaseInfo && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${phaseInfo.badge}`}>
                        {phaseInfo.label}
                      </span>
                    )}
                    {obj.fields.knowledge_type && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${KNOWLEDGE_TYPE_COLORS[obj.fields.knowledge_type.key] ?? 'bg-muted text-muted-foreground'}`}>
                        {obj.fields.knowledge_type.label}
                      </span>
                    )}
                    {obj.fields.ai_support && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                        AI-unterstützt
                      </span>
                    )}
                  </div>
                </DialogHeader>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">

                {/* Kennzahlen */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Qualität</p>
                    <p className="font-bold text-sm">{obj.fields.quality_score != null ? `★ ${obj.fields.quality_score}` : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Version</p>
                    <p className="font-bold text-sm truncate">{obj.fields.version ?? '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Geändert</p>
                    <p className="font-bold text-sm truncate">
                      {obj.fields.last_modified ? formatDate(obj.fields.last_modified) : '—'}
                    </p>
                  </div>
                </div>

                {/* KI-Zusammenfassung / Inhalt */}
                {(obj.fields.ai_summary || obj.fields.content) && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                      {obj.fields.ai_summary ? 'KI-Zusammenfassung' : 'Inhalt'}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {obj.fields.ai_summary ?? obj.fields.content}
                    </p>
                  </div>
                )}

                {/* Anhang */}
                {attachment && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                      Anhang
                    </p>
                    {isImageUrl(attachment) ? (
                      <div className="rounded-xl overflow-hidden border">
                        {imageExpanded ? (
                          <div>
                            <img
                              src={attachment}
                              alt={obj.fields.title ?? 'Anhang'}
                              className="w-full h-auto max-h-96 object-contain bg-black/5"
                            />
                            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t">
                              <button
                                onClick={() => setImageExpanded(false)}
                                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                              >
                                <IconPhoto size={12} className="shrink-0" />
                                Verkleinern
                              </button>
                              <a
                                href={attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                              >
                                <IconExternalLink size={12} className="shrink-0" />
                                In neuem Tab öffnen
                              </a>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setImageExpanded(true)}
                            className="w-full relative group"
                            title="Bild anzeigen"
                          >
                            <img
                              src={attachment}
                              alt={obj.fields.title ?? 'Anhang'}
                              className="w-full h-40 object-cover bg-muted/20"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white/90 rounded-full p-2">
                                <IconPhoto size={20} className="text-foreground" />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 text-[11px] text-muted-foreground">
                              <IconPhoto size={12} className="shrink-0" />
                              <span className="flex-1 text-left truncate">Bild anklicken zum Anzeigen</span>
                            </div>
                          </button>
                        )}
                      </div>
                    ) : (
                      <a
                        href={attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border p-3 hover:bg-accent transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <IconFile size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {decodeURIComponent(attachment.split('/').pop() ?? 'Dokument')}
                          </p>
                          <p className="text-xs text-muted-foreground">Klicken zum Öffnen</p>
                        </div>
                        <IconExternalLink size={15} className="shrink-0 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                )}

                {/* Anwendungsbeweise */}
                {obj.fields.application_evidence && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Anwendungsnachweise</p>
                    <p className="text-sm text-foreground leading-relaxed">{obj.fields.application_evidence}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

// ─── Knowledge Card ──────────────────────────────────────────────────────────

function KnowledgeCard({
  item,
  onEdit,
  onDelete,
}: {
  item: EnrichedWissensobjekte;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeKey = item.fields.knowledge_type?.key ?? '';
  const typeLabel = item.fields.knowledge_type?.label;
  const typeColorClass = KNOWLEDGE_TYPE_COLORS[typeKey] ?? 'bg-gray-100 text-gray-600';
  const score = item.fields.quality_score;

  return (
    <div className="rounded-xl bg-background border border-border p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-2 min-w-0">
        <p className="text-sm font-semibold leading-snug flex-1 min-w-0 truncate">
          {item.fields.title ?? '(Kein Titel)'}
        </p>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={13} className="text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 transition-colors"
            title="Löschen"
          >
            <IconTrash size={13} className="text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {typeLabel && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeColorClass}`}>
            {typeLabel}
          </span>
        )}
        {item.fields.ai_support && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            AI
          </span>
        )}
        {score != null && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground ml-auto">
            ★ {score}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {item.authorName && (
          <span className="truncate">{item.authorName}</span>
        )}
        {item.fields.last_modified && (
          <span className="ml-auto shrink-0">{formatDate(item.fields.last_modified)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton & Error ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
