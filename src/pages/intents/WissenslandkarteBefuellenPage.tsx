import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Wissenslandkarten, Wissensobjekte, KartenKnoten } from '@/types/app';
import { WissenslandkartenDialog } from '@/components/dialogs/WissenslandkartenDialog';
import { KartenKnotenDialog } from '@/components/dialogs/KartenKnotenDialog';
import { ObjektVerlinkungenDialog } from '@/components/dialogs/ObjektVerlinkungenDialog';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  IconMap,
  IconPlus,
  IconNetwork,
  IconCheck,
  IconSearch,
  IconArrowRight,
  IconLink,
  IconMapPin,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Karte wählen' },
  { label: 'Knoten hinzufügen' },
  { label: 'Verlinkungen' },
  { label: 'Abschluss' },
];

interface SessionLink {
  fromNodeId: string;
  toNodeId: string;
  fromLabel: string;
  toLabel: string;
  link_type: string;
  link_strength: number;
}

export default function WissenslandkarteBefuellenPage() {
  const [searchParams] = useSearchParams();

  const {
    wissenslandkarten,
    wissensobjekte,
    kartenKnoten,
    benutzerrollen,
    loading,
    error,
    fetchAll,
  } = useDashboardData();

  // Step state — initialize from URL param
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);

  // Step 1 state
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    searchParams.get('karteId') ?? null
  );
  const [karteDialogOpen, setKarteDialogOpen] = useState(false);

  // Step 2 state
  const [nodeSearch, setNodeSearch] = useState('');
  const [addingNodeId, setAddingNodeId] = useState<string | null>(null);
  const [knotenDialogOpen, setKnotenDialogOpen] = useState(false);
  const [wissensobjektDialogOpen, setWissensobjektDialogOpen] = useState(false);

  // Step 3 state
  const [fromNodeId, setFromNodeId] = useState<string>('');
  const [toNodeId, setToNodeId] = useState<string>('');
  const [linkType, setLinkType] = useState<string>('');
  const [linkStrength, setLinkStrength] = useState<number>(5);
  const [sessionLinks, setSessionLinks] = useState<SessionLink[]>([]);
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [verlinkungenDialogOpen, setVerlinkungenDialogOpen] = useState(false);

  // Sync karteId from URL on mount
  useEffect(() => {
    const urlKarteId = searchParams.get('karteId');
    if (urlKarteId && !selectedMapId) {
      setSelectedMapId(urlKarteId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived: selected map record
  const selectedMap: Wissenslandkarten | undefined = useMemo(
    () => wissenslandkarten.find(m => m.record_id === selectedMapId),
    [wissenslandkarten, selectedMapId]
  );

  // Derived: nodes already in this map
  const mapNodes: KartenKnoten[] = useMemo(() => {
    if (!selectedMapId) return [];
    const mapUrl = createRecordUrl(APP_IDS.WISSENSLANDKARTEN, selectedMapId);
    return kartenKnoten.filter(kn => kn.fields.mn_map === mapUrl);
  }, [kartenKnoten, selectedMapId]);

  // Set of wissensobjekt IDs already in the map
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    mapNodes.forEach(kn => {
      const id = extractRecordId(kn.fields.mn_item);
      if (id) ids.add(id);
    });
    return ids;
  }, [mapNodes]);

  // Wissensobjekte NOT yet in the map
  const availableObjekte: Wissensobjekte[] = useMemo(() => {
    return wissensobjekte.filter(o => !addedItemIds.has(o.record_id));
  }, [wissensobjekte, addedItemIds]);

  // Filtered by search
  const filteredObjekte = useMemo(() => {
    if (!nodeSearch) return availableObjekte;
    const q = nodeSearch.toLowerCase();
    return availableObjekte.filter(
      o =>
        (o.fields.title ?? '').toLowerCase().includes(q) ||
        (o.fields.phase?.label ?? '').toLowerCase().includes(q)
    );
  }, [availableObjekte, nodeSearch]);

  const linkTypeOptions = LOOKUP_OPTIONS['objekt_verlinkungen']?.link_type ?? [];

  // Handlers
  const handleSelectMap = (id: string) => {
    setSelectedMapId(id);
  };

  const handleGoToStep2 = () => {
    if (selectedMapId) setCurrentStep(2);
  };

  const handleAddNode = async (item: Wissensobjekte) => {
    if (!selectedMapId) return;
    setAddingNodeId(item.record_id);
    try {
      const nodeIndex = mapNodes.length;
      await LivingAppsService.createKartenKnotenEntry({
        mn_map: createRecordUrl(APP_IDS.WISSENSLANDKARTEN, selectedMapId),
        mn_item: createRecordUrl(APP_IDS.WISSENSOBJEKTE, item.record_id),
        node_label: item.fields.title ?? '',
        pos_x: nodeIndex * 150,
        pos_y: 0,
        mn_added_at: new Date().toISOString().slice(0, 16),
      });
      await fetchAll();
    } finally {
      setAddingNodeId(null);
    }
  };

  const handleCreateLink = async () => {
    if (!fromNodeId || !toNodeId || !linkType) return;
    if (fromNodeId === toNodeId) {
      setLinkError('Quell- und Zielknoten dürfen nicht identisch sein.');
      return;
    }
    setLinkError(null);
    setCreatingLink(true);
    try {
      await LivingAppsService.createObjektVerlinkungenEntry({
        item_from: createRecordUrl(APP_IDS.WISSENSOBJEKTE, fromNodeId),
        item_to: createRecordUrl(APP_IDS.WISSENSOBJEKTE, toNodeId),
        link_type: linkType,
        link_strength: linkStrength,
        il_created_at: new Date().toISOString().slice(0, 16),
      });
      const fromLabel =
        mapNodes.find(n => extractRecordId(n.fields.mn_item) === fromNodeId)?.fields.node_label ??
        fromNodeId;
      const toLabel =
        mapNodes.find(n => extractRecordId(n.fields.mn_item) === toNodeId)?.fields.node_label ??
        toNodeId;
      const typeLabel = linkTypeOptions.find(o => o.key === linkType)?.label ?? linkType;
      setSessionLinks(prev => [
        ...prev,
        { fromNodeId, toNodeId, fromLabel, toLabel, link_type: typeLabel, link_strength: linkStrength },
      ]);
      setFromNodeId('');
      setToNodeId('');
      setLinkType('');
      setLinkStrength(5);
      await fetchAll();
    } finally {
      setCreatingLink(false);
    }
  };

  const handleReset = () => {
    setSelectedMapId(null);
    setNodeSearch('');
    setSessionLinks([]);
    setFromNodeId('');
    setToNodeId('');
    setLinkType('');
    setLinkStrength(5);
    setLinkError(null);
    setCurrentStep(1);
  };

  return (
    <IntentWizardShell
      title="Wissenslandkarte befüllen"
      subtitle="Wähle eine Karte, füge Knoten hinzu und definiere Verlinkungen."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Wissenslandkarte auswählen ── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Welche Wissenslandkarte möchtest du befüllen?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle eine bestehende Karte aus oder lege eine neue an.
            </p>
          </div>

          <EntitySelectStep
            items={wissenslandkarten.map(m => ({
              id: m.record_id,
              title: m.fields.map_title ?? '(Kein Titel)',
              subtitle: m.fields.map_type?.label,
              stats: m.fields.map_created_at
                ? [{ label: 'Erstellt am', value: m.fields.map_created_at.slice(0, 10) }]
                : [],
              icon: <IconMap size={18} className="text-primary" />,
            }))}
            onSelect={id => {
              handleSelectMap(id);
            }}
            searchPlaceholder="Karte suchen..."
            emptyText="Noch keine Wissenslandkarten vorhanden."
            emptyIcon={<IconMap size={32} />}
            createLabel="Neue Karte anlegen"
            onCreateNew={() => setKarteDialogOpen(true)}
            createDialog={
              <WissenslandkartenDialog
                open={karteDialogOpen}
                onClose={() => setKarteDialogOpen(false)}
                onSubmit={async fields => {
                  await LivingAppsService.createWissenslandkartenEntry(fields);
                  await fetchAll();
                }}
                benutzerrollenList={benutzerrollen}
                enablePhotoScan={AI_PHOTO_SCAN['Wissenslandkarten']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Wissenslandkarten']}
              />
            }
          />

          {selectedMapId && selectedMap && (
            <div className="rounded-xl border bg-primary/5 p-4 flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <IconCheck size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {selectedMap.fields.map_title ?? '(Kein Titel)'}
                  </p>
                  {selectedMap.fields.map_type && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedMap.fields.map_type.label}
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={handleGoToStep2} className="shrink-0 gap-1.5">
                Weiter
                <IconArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Knoten hinzufügen ── */}
      {currentStep === 2 && selectedMap && (
        <div className="space-y-5">
          {/* Map context card */}
          <div className="rounded-xl border bg-card p-4 overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconMap size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {selectedMap.fields.map_title ?? '(Kein Titel)'}
                </p>
                {selectedMap.fields.map_description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {selectedMap.fields.map_description}
                  </p>
                )}
              </div>
              <span className="ml-auto shrink-0 text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full whitespace-nowrap">
                {mapNodes.length} Knoten
              </span>
            </div>
          </div>

          {/* Already-added nodes */}
          {mapNodes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Bereits hinzugefügte Knoten
              </h3>
              <div className="space-y-1.5">
                {mapNodes.map(kn => (
                  <div
                    key={kn.record_id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 overflow-hidden"
                  >
                    <IconMapPin size={14} className="text-primary shrink-0" />
                    <span className="text-sm truncate">{kn.fields.node_label ?? kn.record_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search + add wissensobjekte */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">Wissensobjekte als Knoten hinzufügen</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWissensobjektDialogOpen(true)}
                  className="gap-1.5"
                >
                  <IconPlus size={14} />
                  Neues Objekt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKnotenDialogOpen(true)}
                  className="gap-1.5"
                >
                  <IconPlus size={14} />
                  Knoten manuell
                </Button>
              </div>
            </div>

            {/* Dialogs */}
            <WissensobjekteDialog
              open={wissensobjektDialogOpen}
              onClose={() => setWissensobjektDialogOpen(false)}
              onSubmit={async fields => {
                await LivingAppsService.createWissensobjekteEntry(fields);
                await fetchAll();
              }}
              benutzerrollenList={benutzerrollen}
              enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
              enablePhotoLocation={AI_PHOTO_LOCATION['Wissensobjekte']}
            />
            <KartenKnotenDialog
              open={knotenDialogOpen}
              onClose={() => setKnotenDialogOpen(false)}
              onSubmit={async fields => {
                await LivingAppsService.createKartenKnotenEntry(fields);
                await fetchAll();
              }}
              wissenslandkartenList={wissenslandkarten}
              wissensobjekteList={wissensobjekte}
              benutzerrollenList={benutzerrollen}
              enablePhotoScan={AI_PHOTO_SCAN['KartenKnoten']}
              enablePhotoLocation={AI_PHOTO_LOCATION['KartenKnoten']}
            />

            {/* Search input */}
            <div className="relative mb-3">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Wissensobjekte durchsuchen..."
                value={nodeSearch}
                onChange={e => setNodeSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            {filteredObjekte.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <IconNetwork size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {availableObjekte.length === 0
                    ? 'Alle Wissensobjekte wurden bereits als Knoten hinzugefügt.'
                    : 'Keine Ergebnisse für deine Suche.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredObjekte.map(item => (
                  <div
                    key={item.record_id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {item.fields.title ?? '(Kein Titel)'}
                        </span>
                        {item.fields.phase && (
                          <StatusBadge
                            statusKey={item.fields.phase.key}
                            label={item.fields.phase.label}
                          />
                        )}
                      </div>
                      {item.fields.quality_score !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Qualität: {item.fields.quality_score}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={addingNodeId === item.record_id}
                      onClick={() => handleAddNode(item)}
                      className="shrink-0 gap-1.5"
                    >
                      {addingNodeId === item.record_id ? (
                        <IconRefresh size={14} className="animate-spin" />
                      ) : (
                        <IconPlus size={14} />
                      )}
                      Als Knoten hinzufügen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={mapNodes.length === 0}
              className="gap-1.5"
            >
              Weiter zu Verlinkungen
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Verlinkungen definieren ── */}
      {currentStep === 3 && selectedMap && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Verlinkungen zwischen Knoten definieren</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verbinde Wissensknoten miteinander, um Beziehungen sichtbar zu machen.
            </p>
          </div>

          {mapNodes.length < 2 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/30">
              <IconLink size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Du benötigst mindestens 2 Knoten, um Verlinkungen zu erstellen.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentStep(2)}>
                Zurück zu Knoten
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-4 space-y-4 overflow-hidden">
              <h3 className="text-sm font-semibold">Neue Verlinkung erstellen</h3>

              {/* From / To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Von Knoten</label>
                  <Select value={fromNodeId} onValueChange={setFromNodeId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Quellknoten wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mapNodes.map(kn => {
                        const itemId = extractRecordId(kn.fields.mn_item);
                        if (!itemId) return null;
                        return (
                          <SelectItem key={kn.record_id} value={itemId}>
                            {kn.fields.node_label ?? itemId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Zu Knoten</label>
                  <Select value={toNodeId} onValueChange={setToNodeId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Zielknoten wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mapNodes.map(kn => {
                        const itemId = extractRecordId(kn.fields.mn_item);
                        if (!itemId) return null;
                        return (
                          <SelectItem key={kn.record_id} value={itemId}>
                            {kn.fields.node_label ?? itemId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Verlinkungstyp</label>
                <Select value={linkType} onValueChange={setLinkType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Typ wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {linkTypeOptions.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link strength slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Stärke der Verlinkung
                  </label>
                  <span className="text-xs font-semibold text-primary">{linkStrength} / 10</span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[linkStrength]}
                  onValueChange={([v]) => setLinkStrength(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Schwach</span>
                  <span>Stark</span>
                </div>
              </div>

              {linkError && (
                <p className="text-xs text-destructive">{linkError}</p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCreateLink}
                  disabled={!fromNodeId || !toNodeId || !linkType || creatingLink}
                  className="gap-1.5"
                >
                  {creatingLink ? (
                    <IconRefresh size={15} className="animate-spin" />
                  ) : (
                    <IconLink size={15} />
                  )}
                  Verlinkung erstellen
                </Button>

                {/* Also allow creating via dialog */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerlinkungenDialogOpen(true)}
                  className="gap-1.5"
                >
                  <IconPlus size={14} />
                  Erweiterte Verlinkung
                </Button>
              </div>

              <ObjektVerlinkungenDialog
                open={verlinkungenDialogOpen}
                onClose={() => setVerlinkungenDialogOpen(false)}
                onSubmit={async fields => {
                  await LivingAppsService.createObjektVerlinkungenEntry(fields);
                  await fetchAll();
                }}
                wissensobjekteList={wissensobjekte}
                benutzerrollenList={benutzerrollen}
                enablePhotoScan={AI_PHOTO_SCAN['ObjektVerlinkungen']}
                enablePhotoLocation={AI_PHOTO_LOCATION['ObjektVerlinkungen']}
              />
            </div>
          )}

          {/* Session links list */}
          {sessionLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                In dieser Sitzung erstellt ({sessionLinks.length})
              </h3>
              <div className="space-y-1.5">
                {sessionLinks.map((lnk, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 overflow-hidden"
                  >
                    <IconLink size={14} className="text-primary shrink-0" />
                    <span className="text-sm min-w-0 truncate">
                      <span className="font-medium">{lnk.fromLabel}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="font-medium">{lnk.toLabel}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {lnk.link_type} · {lnk.link_strength}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(4)}>
                Weiter ohne Verlinkung
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={sessionLinks.length === 0}
                className="gap-1.5"
              >
                <IconCheck size={15} />
                Verlinkungen abschliessen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Zusammenfassung ── */}
      {currentStep === 4 && selectedMap && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Zusammenfassung & Abschluss</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Die Wissenslandkarte wurde erfolgreich befüllt.
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border bg-card p-5 space-y-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconCheck size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {selectedMap.fields.map_title ?? '(Kein Titel)'}
                </p>
                {selectedMap.fields.map_type && (
                  <p className="text-xs text-muted-foreground">{selectedMap.fields.map_type.label}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{mapNodes.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Knoten in der Karte</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{sessionLinks.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Verlinkungen erstellt</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="#/wissenslandkarten" className="flex-1">
              <Button variant="outline" className="w-full gap-1.5">
                <IconMap size={16} />
                Karte öffnen
              </Button>
            </a>
            <Button onClick={handleReset} className="flex-1 gap-1.5">
              <IconRefresh size={16} />
              Neue Karte befüllen
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
