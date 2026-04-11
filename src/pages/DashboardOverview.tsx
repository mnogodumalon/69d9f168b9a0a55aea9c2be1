import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWissensobjekte } from '@/lib/enrich';
import type { EnrichedWissensobjekte } from '@/types/enriched';
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
  IconStar, IconTrendingUp, IconSearch
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';

const APPGROUP_ID = '69d9f168b9a0a55aea9c2be1';
const REPAIR_ENDPOINT = '/claude/build/repair';

const PHASES = [
  { key: 'discovery', label: 'Discovery', icon: IconBulb, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { key: 'codification', label: 'Codification', icon: IconBook, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { key: 'dissemination', label: 'Dissemination', icon: IconShare, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  { key: 'application', label: 'Application', icon: IconRocket, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  { key: 'archived', label: 'Archived', icon: IconArchive, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/30', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
];

const KNOWLEDGE_TYPE_COLORS: Record<string, string> = {
  explicit: 'bg-sky-100 text-sky-700',
  tacit_extracted: 'bg-purple-100 text-purple-700',
  hybrid: 'bg-orange-100 text-orange-700',
  process: 'bg-teal-100 text-teal-700',
  lesson_learned: 'bg-rose-100 text-rose-700',
};

export default function DashboardOverview() {
  const {
    benutzerrollen, wissensobjekte, wissenslandkarten,
    benutzerrollenMap,
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
          return (
            <div key={phase.key} className={`rounded-2xl border ${phase.border} ${phase.bg} overflow-hidden flex flex-col`}>
              {/* Column Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit">
                <PhaseIcon size={16} className={`${phase.color} shrink-0`} />
                <span className="font-semibold text-sm text-foreground truncate">{phase.label}</span>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${phase.badge}`}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-3 flex-1 min-h-[120px] max-h-[520px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <PhaseIcon size={28} className="opacity-25 mb-2" stroke={1.5} />
                    <span className="text-xs">Keine Einträge</span>
                  </div>
                ) : (
                  items.map(item => (
                    <KnowledgeCard
                      key={item.record_id}
                      item={item}
                      onEdit={() => { setEditRecord(item); setDialogOpen(true); }}
                      onDelete={() => setDeleteTarget(item)}
                    />
                  ))
                )}
              </div>

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
            </div>
          );
        })}
      </div>

      {/* Sidebar Stats: Authors & Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Authors */}
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <IconUsers size={16} className="text-muted-foreground shrink-0" />
            <h3 className="font-semibold text-sm">Autoren & Beiträge</h3>
          </div>
          {benutzerrollen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Benutzer</p>
          ) : (
            <div className="space-y-2">
              {benutzerrollen.slice(0, 6).map(user => {
                const contributions = wissensobjekte.filter(w =>
                  extractRecordId(w.fields.author) === user.record_id
                ).length;
                return (
                  <div key={user.record_id} className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
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

        {/* Wissenslandkarten */}
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <IconMap size={16} className="text-muted-foreground shrink-0" />
            <h3 className="font-semibold text-sm">Wissenslandkarten</h3>
          </div>
          {wissenslandkarten.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Karten angelegt</p>
          ) : (
            <div className="space-y-2">
              {wissenslandkarten.slice(0, 6).map(karte => (
                <div key={karte.record_id} className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <IconMap size={14} className="text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{karte.fields.map_title ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{karte.fields.map_type?.label ?? '—'}</p>
                  </div>
                  {karte.fields.map_created_at && (
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(karte.fields.map_created_at)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
      {/* Title + actions */}
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

      {/* Badges row */}
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

      {/* Meta */}
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
