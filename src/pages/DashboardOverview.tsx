import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWissenslandkarten, enrichWissensobjekte, enrichFeedbackUndVersionen } from '@/lib/enrich';
import type { EnrichedWissensobjekte } from '@/types/enriched';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { WissenslandkartenDialog } from '@/components/dialogs/WissenslandkartenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash,
  IconBrain, IconMap, IconLink, IconStar, IconEye, IconUsers, IconChevronRight
} from '@tabler/icons-react';
import type { CreateWissensobjekte, CreateWissenslandkarten } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';

const APPGROUP_ID = '69d9f168b9a0a55aea9c2be1';
const REPAIR_ENDPOINT = '/claude/build/repair';

const PHASES = [
  { key: 'discovery', label: 'Discovery', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { key: 'codification', label: 'Codification', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'dissemination', label: 'Dissemination', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { key: 'application', label: 'Application', color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-500 border-gray-200' },
];

const KNOWLEDGE_TYPE_COLORS: Record<string, string> = {
  explicit: 'bg-indigo-50 text-indigo-700',
  tacit_extracted: 'bg-amber-50 text-amber-700',
  hybrid: 'bg-purple-50 text-purple-700',
  process: 'bg-teal-50 text-teal-700',
  lesson_learned: 'bg-rose-50 text-rose-700',
};

export default function DashboardOverview() {
  const {
    benutzerrollen, wissenslandkarten, wissensobjekte, feedbackUndVersionen, objektVerlinkungen,
    benutzerrollenMap, wissensobjekteMap, feedbackUndVersionenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  // All hooks BEFORE early returns
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editObjekt, setEditObjekt] = useState<EnrichedWissensobjekte | null>(null);
  const [createObjektOpen, setCreateObjektOpen] = useState(false);
  const [createObjektPhase, setCreateObjektPhase] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedWissensobjekte | null>(null);
  const [createMapOpen, setCreateMapOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'kanban' | 'maps'>('kanban');

  const enrichedWissenslandkarten = enrichWissenslandkarten(wissenslandkarten, { benutzerrollenMap });
  const enrichedWissensobjekte = enrichWissensobjekte(wissensobjekte, { benutzerrollenMap });
  const enrichedFeedbackUndVersionen = enrichFeedbackUndVersionen(feedbackUndVersionen, { wissensobjekteMap, benutzerrollenMap });

  const filteredObjekte = useMemo(() => {
    let items = enrichedWissensobjekte;
    if (selectedPhase) items = items.filter(o => o.fields.phase?.key === selectedPhase);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(o =>
        (o.fields.title ?? '').toLowerCase().includes(q) ||
        (o.authorName ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [enrichedWissensobjekte, selectedPhase, searchQuery]);

  const objByPhase = useMemo(() => {
    const map: Record<string, EnrichedWissensobjekte[]> = {};
    PHASES.forEach(p => { map[p.key] = []; });
    filteredObjekte.forEach(o => {
      const key = o.fields.phase?.key ?? 'discovery';
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [filteredObjekte]);

  const avgQuality = useMemo(() => {
    const scored = enrichedWissensobjekte.filter(o => o.fields.quality_score != null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, o) => sum + (o.fields.quality_score ?? 0), 0) / scored.length * 10) / 10;
  }, [enrichedWissensobjekte]);

  const recentFeedback = useMemo(() =>
    [...enrichedFeedbackUndVersionen]
      .sort((a, b) => (b.fields.timestamp ?? '').localeCompare(a.fields.timestamp ?? ''))
      .slice(0, 5),
    [enrichedFeedbackUndVersionen]
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteWissensobjekteEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Intent Workflows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/kuratiere-wissensobjekt" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow no-underline overflow-hidden">
          <IconBrain size={22} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">Wissensobjekt kuratieren</p>
            <p className="text-xs text-muted-foreground line-clamp-2">Objekt auswählen, Feedback hinzufügen, Qualität & Phase aktualisieren</p>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/befuelle-wissenskarte" className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow no-underline overflow-hidden">
          <IconMap size={22} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">Wissenskarte befüllen</p>
            <p className="text-xs text-muted-foreground line-clamp-2">Karte auswählen, Wissensobjekte als Knoten hinzufügen, Verlinkungen erstellen</p>
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
          icon={<IconBrain size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Wissenslandkarten"
          value={String(wissenslandkarten.length)}
          description="Karten"
          icon={<IconMap size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verlinkungen"
          value={String(objektVerlinkungen.length)}
          description="Verbindungen"
          icon={<IconLink size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ø Qualität"
          value={avgQuality > 0 ? String(avgQuality) : '—'}
          description="Qualitätsscore"
          icon={<IconStar size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-full sm:w-auto self-start">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <IconBrain size={15} className="shrink-0" />
          Wissensobjekte
        </button>
        <button
          onClick={() => setActiveTab('maps')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'maps' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <IconMap size={15} className="shrink-0" />
          Wissenslandkarten
        </button>
      </div>

      {activeTab === 'kanban' && (
        <>
          {/* Kanban controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 px-3 text-sm rounded-lg border border-input bg-background min-w-0 w-48 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedPhase(null)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${selectedPhase === null ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input text-muted-foreground hover:text-foreground'}`}
              >
                Alle
              </button>
              {PHASES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPhase(selectedPhase === p.key ? null : p.key)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${selectedPhase === p.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input text-muted-foreground hover:text-foreground'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => { setCreateObjektPhase(undefined); setCreateObjektOpen(true); }}
            >
              <IconPlus size={14} className="mr-1 shrink-0" />
              Neues Objekt
            </Button>
          </div>

          {/* Kanban board */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {PHASES.map(phase => {
                const items = objByPhase[phase.key] ?? [];
                return (
                  <div key={phase.key} className="w-72 shrink-0 flex flex-col gap-2">
                    {/* Column header */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${phase.color}`}>
                      <span className="font-semibold text-sm">{phase.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium opacity-70">{items.length}</span>
                        <button
                          onClick={() => { setCreateObjektPhase(phase.key); setCreateObjektOpen(true); }}
                          className="p-0.5 rounded hover:bg-black/10 transition-colors"
                          title="Objekt hinzufügen"
                        >
                          <IconPlus size={13} className="shrink-0" />
                        </button>
                      </div>
                    </div>
                    {/* Cards */}
                    <div className="flex flex-col gap-2 min-h-[80px]">
                      {items.length === 0 && (
                        <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                          Keine Einträge
                        </div>
                      )}
                      {items.map(obj => (
                        <KnowledgeCard
                          key={obj.record_id}
                          obj={obj}
                          onEdit={() => setEditObjekt(obj)}
                          onDelete={() => setDeleteTarget(obj)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'maps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Wissenslandkarten</h2>
            <Button size="sm" onClick={() => setCreateMapOpen(true)}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              Neue Karte
            </Button>
          </div>
          {enrichedWissenslandkarten.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconMap size={48} stroke={1.5} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Noch keine Wissenslandkarten vorhanden.</p>
              <Button size="sm" variant="outline" onClick={() => setCreateMapOpen(true)}>
                <IconPlus size={14} className="mr-1" />Erste Karte erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichedWissenslandkarten.map(map => {
                const nodeCount = (map.fields.nodes_data ?? '').length > 2 ? '—' : '0';
                return (
                  <div key={map.record_id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 overflow-hidden">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{map.fields.map_title ?? 'Unbenannte Karte'}</p>
                        {map.fields.map_type && (
                          <span className="text-xs text-muted-foreground">{map.fields.map_type.label}</span>
                        )}
                      </div>
                      <IconMap size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    {map.fields.map_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{map.fields.map_description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
                      {map.map_creatorName && (
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <IconUsers size={12} className="shrink-0" />
                          <span className="truncate">{map.map_creatorName}</span>
                        </span>
                      )}
                      {map.fields.map_created_at && (
                        <span className="shrink-0">{formatDate(map.fields.map_created_at)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Knoten:</span>
                      <span className="font-medium">{nodeCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sidebar: Recent Feedback */}
      {activeTab === 'kanban' && recentFeedback.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <IconEye size={16} className="text-muted-foreground shrink-0" />
            <h3 className="font-semibold text-sm">Letzte Aktivitäten</h3>
          </div>
          <div className="space-y-2">
            {recentFeedback.map(fb => (
              <div key={fb.record_id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{fb.related_itemName || 'Wissensobjekt'}</p>
                  {fb.fields.feedback_text && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{fb.fields.feedback_text}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {fb.fields.change_type && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {fb.fields.change_type.label}
                    </Badge>
                  )}
                  {fb.fields.timestamp && (
                    <span className="text-xs text-muted-foreground">{formatDate(fb.fields.timestamp)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <WissensobjekteDialog
        open={createObjektOpen || !!editObjekt}
        onClose={() => { setCreateObjektOpen(false); setEditObjekt(null); }}
        onSubmit={async (fields: CreateWissensobjekte) => {
          if (editObjekt) {
            await LivingAppsService.updateWissensobjekteEntry(editObjekt.record_id, fields);
          } else {
            await LivingAppsService.createWissensobjekteEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={(() => {
          if (editObjekt) {
            if (createObjektPhase) {
              const phaseOpt = LOOKUP_OPTIONS['wissensobjekte']?.['phase']?.find(o => o.key === createObjektPhase);
              return { ...editObjekt.fields, ...(phaseOpt ? { phase: phaseOpt } : {}) };
            }
            return { ...editObjekt.fields };
          }
          if (createObjektPhase) {
            const phaseOpt = LOOKUP_OPTIONS['wissensobjekte']?.['phase']?.find(o => o.key === createObjektPhase);
            return phaseOpt ? { phase: phaseOpt } : undefined;
          }
          return undefined;
        })()}
        benutzerrollenList={benutzerrollen}
        enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Wissensobjekte']}
      />

      <WissenslandkartenDialog
        open={createMapOpen}
        onClose={() => setCreateMapOpen(false)}
        onSubmit={async (fields: CreateWissenslandkarten) => {
          await LivingAppsService.createWissenslandkartenEntry(fields);
          fetchAll();
        }}
        benutzerrollenList={benutzerrollen}
        enablePhotoScan={AI_PHOTO_SCAN['Wissenslandkarten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Wissenslandkarten']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Wissensobjekt löschen"
        description={`"${deleteTarget?.fields.title ?? 'Objekt'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function KnowledgeCard({
  obj,
  onEdit,
  onDelete,
}: {
  obj: EnrichedWissensobjekte;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeColor = KNOWLEDGE_TYPE_COLORS[obj.fields.knowledge_type?.key ?? ''] ?? 'bg-gray-50 text-gray-600';

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate min-w-0">{obj.fields.title ?? 'Unbenannt'}</p>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Bearbeiten"
          >
            <IconPencil size={13} className="shrink-0 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 transition-colors"
            title="Löschen"
          >
            <IconTrash size={13} className="shrink-0 text-destructive" />
          </button>
        </div>
      </div>

      {obj.fields.knowledge_type && (
        <span className={`inline-flex self-start text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
          {obj.fields.knowledge_type.label}
        </span>
      )}

      {obj.fields.ai_summary && (
        <p className="text-xs text-muted-foreground line-clamp-2">{obj.fields.ai_summary}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-auto flex-wrap">
        {obj.authorName && (
          <span className="flex items-center gap-1 min-w-0 truncate">
            <IconUsers size={11} className="shrink-0" />
            <span className="truncate">{obj.authorName}</span>
          </span>
        )}
        {obj.fields.quality_score != null && (
          <span className="flex items-center gap-0.5 shrink-0">
            <IconStar size={11} className="shrink-0 text-amber-400" />
            <span>{obj.fields.quality_score}</span>
          </span>
        )}
      </div>

      {obj.fields.version && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconChevronRight size={11} className="shrink-0" />
          <span>v{obj.fields.version}</span>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-8 w-64 rounded-xl" />
      <div className="flex gap-4 overflow-hidden">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-72 h-64 rounded-xl shrink-0" />)}
      </div>
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
