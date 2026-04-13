import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { WissenslandkartenDialog } from '@/components/dialogs/WissenslandkartenDialog';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { ObjektVerlinkungenDialog } from '@/components/dialogs/ObjektVerlinkungenDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Wissenslandkarten, Wissensobjekte, KartenKnoten, ObjektVerlinkungen } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconMap,
  IconPlus,
  IconArrowRight,
  IconArrowLeft,
  IconNetwork,
  IconCheck,
  IconSearch,
  IconBrain,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Karte auswählen' },
  { label: 'Knoten hinzufügen' },
  { label: 'Verlinkungen' },
  { label: 'Zusammenfassung' },
];

function getCurrentDateTimeMinute(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function BefuelleWissenskartePage() {
  const [searchParams] = useSearchParams();

  const {
    benutzerrollen,
    wissenslandkarten,
    wissensobjekte,
    kartenKnoten,
    objektVerlinkungen,
    loading,
    error,
    fetchAll,
  } = useDashboardData();

  // Wizard state — initialise from URL
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedMap, setSelectedMap] = useState<Wissenslandkarten | null>(null);
  const [sessionLinkCount, setSessionLinkCount] = useState(0);

  // Dialog visibility state
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  // Adding-node busy state
  const [addingNodeId, setAddingNodeId] = useState<string | null>(null);

  // Step 2 object search
  const [objSearch, setObjSearch] = useState('');

  // Deep-link: restore selected map from URL param ?karteId=...
  useEffect(() => {
    const karteId = searchParams.get('karteId');
    if (karteId && wissenslandkarten.length > 0 && !selectedMap) {
      const found = wissenslandkarten.find(k => k.record_id === karteId);
      if (found) setSelectedMap(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wissenslandkarten]);

  // Nodes currently on the selected map
  const mapNodes: KartenKnoten[] = useMemo(() => {
    if (!selectedMap) return [];
    const mapUrl = createRecordUrl(APP_IDS.WISSENSLANDKARTEN, selectedMap.record_id);
    return kartenKnoten.filter(kn => kn.fields.mn_map === mapUrl);
  }, [selectedMap, kartenKnoten]);

  // Set of wissensobjekte IDs already on the map (to filter them out)
  const addedItemIds = useMemo(() => {
    return new Set(
      mapNodes
        .map(kn => extractRecordId(kn.fields.mn_item))
        .filter((id): id is string => id !== null)
    );
  }, [mapNodes]);

  // Wissensobjekte not yet added to this map
  const availableObjects: Wissensobjekte[] = useMemo(() => {
    return wissensobjekte.filter(obj => !addedItemIds.has(obj.record_id));
  }, [wissensobjekte, addedItemIds]);

  // Filtered by search term
  const filteredObjects = useMemo(() => {
    if (!objSearch.trim()) return availableObjects;
    const q = objSearch.toLowerCase();
    return availableObjects.filter(obj =>
      (obj.fields.title ?? '').toLowerCase().includes(q)
    );
  }, [availableObjects, objSearch]);

  // Existing verlinkungen for objects on this map
  const mapItemIds: Set<string> = useMemo(() => {
    const ids = new Set<string>();
    mapNodes.forEach(kn => {
      const id = extractRecordId(kn.fields.mn_item);
      if (id) ids.add(id);
    });
    return ids;
  }, [mapNodes]);

  const mapLinks: ObjektVerlinkungen[] = useMemo(() => {
    return objektVerlinkungen.filter(link => {
      const fromId = extractRecordId(link.fields.item_from);
      const toId = extractRecordId(link.fields.item_to);
      return (fromId && mapItemIds.has(fromId)) || (toId && mapItemIds.has(toId));
    });
  }, [objektVerlinkungen, mapItemIds]);

  // Helper: get label for wissensobjekt by URL or ID
  function getObjLabel(urlOrId: string | undefined): string {
    if (!urlOrId) return '–';
    const id = extractRecordId(urlOrId) ?? urlOrId;
    const obj = wissensobjekte.find(o => o.record_id === id);
    return obj?.fields.title ?? id;
  }

  // Add a wissensobjekt as a node on the map
  async function handleAddNode(obj: Wissensobjekte) {
    if (!selectedMap) return;
    setAddingNodeId(obj.record_id);
    try {
      await LivingAppsService.createKartenKnotenEntry({
        mn_map: createRecordUrl(APP_IDS.WISSENSLANDKARTEN, selectedMap.record_id),
        mn_item: createRecordUrl(APP_IDS.WISSENSOBJEKTE, obj.record_id),
        pos_x: 0,
        pos_y: 0,
        node_label: obj.fields.title ?? '',
        mn_added_at: getCurrentDateTimeMinute(),
      });
      await fetchAll();
    } finally {
      setAddingNodeId(null);
    }
  }

  // Select map and advance to step 2
  function handleSelectMap(id: string) {
    const map = wissenslandkarten.find(m => m.record_id === id);
    if (map) {
      setSelectedMap(map);
      setSessionLinkCount(0);
      setCurrentStep(2);
    }
  }

  function handleReset() {
    setSelectedMap(null);
    setSessionLinkCount(0);
    setObjSearch('');
    setCurrentStep(1);
  }

  // First node item URL for default value in link dialog
  const firstNodeItemUrl = useMemo(() => {
    if (mapNodes.length === 0) return undefined;
    const firstItemId = extractRecordId(mapNodes[0].fields.mn_item);
    if (!firstItemId) return undefined;
    return createRecordUrl(APP_IDS.WISSENSOBJEKTE, firstItemId);
  }, [mapNodes]);

  return (
    <IntentWizardShell
      title="Wissenskarte befüllen"
      subtitle="Füge Wissensobjekte als Knoten zu einer Karte hinzu und verlinke sie miteinander."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Karte auswählen ── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle eine Wissenslandkarte, die du befüllen möchtest, oder erstelle eine neue.
          </p>
          <EntitySelectStep
            items={wissenslandkarten.map(m => ({
              id: m.record_id,
              title: m.fields.map_title ?? '(Ohne Titel)',
              subtitle: m.fields.map_type?.label,
              icon: <IconMap size={18} className="text-primary" />,
              stats: [
                {
                  label: 'Knoten',
                  value: kartenKnoten.filter(
                    kn => kn.fields.mn_map === createRecordUrl(APP_IDS.WISSENSLANDKARTEN, m.record_id)
                  ).length,
                },
                {
                  label: 'Typ',
                  value: m.fields.map_type?.label ?? '–',
                },
              ],
            }))}
            onSelect={handleSelectMap}
            searchPlaceholder="Karte suchen..."
            emptyIcon={<IconMap size={32} />}
            emptyText="Noch keine Wissenslandkarten vorhanden."
            createLabel="Neue Karte erstellen"
            onCreateNew={() => setMapDialogOpen(true)}
            createDialog={
              <WissenslandkartenDialog
                open={mapDialogOpen}
                onClose={() => setMapDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createWissenslandkartenEntry(fields);
                  await fetchAll();
                  setMapDialogOpen(false);
                }}
                defaultValues={undefined}
                benutzerrollenList={benutzerrollen}
                enablePhotoScan={AI_PHOTO_SCAN['Wissenslandkarten']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Wissenslandkarten']}
              />
            }
          />
        </div>
      )}

      {/* ── STEP 2: Wissensobjekte als Knoten hinzufügen ── */}
      {currentStep === 2 && selectedMap && (
        <div className="space-y-5">
          {/* Map header */}
          <div className="flex items-start gap-3 p-4 rounded-xl border bg-card overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconMap size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Ausgewählte Karte</p>
              <p className="font-semibold truncate">{selectedMap.fields.map_title ?? '(Ohne Titel)'}</p>
              {selectedMap.fields.map_type?.label && (
                <p className="text-xs text-muted-foreground mt-0.5">{selectedMap.fields.map_type.label}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-2xl font-bold text-primary">{mapNodes.length}</span>
              <p className="text-xs text-muted-foreground">Knoten auf dieser Karte</p>
            </div>
          </div>

          {/* Currently added nodes */}
          {mapNodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Bereits hinzugefügte Knoten
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {mapNodes.map(kn => {
                  const itemId = extractRecordId(kn.fields.mn_item);
                  const obj = itemId ? wissensobjekte.find(o => o.record_id === itemId) : null;
                  return (
                    <div key={kn.record_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm overflow-hidden">
                      <IconCheck size={14} className="text-green-600 shrink-0" />
                      <span className="truncate min-w-0">{obj?.fields.title ?? kn.fields.node_label ?? '–'}</span>
                      {obj?.fields.phase && (
                        <StatusBadge statusKey={obj.fields.phase.key} label={obj.fields.phase.label} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available objects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Wissensobjekte hinzufügen
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setObjDialogOpen(true)}
                className="gap-1.5"
              >
                <IconPlus size={14} />
                Neues Wissensobjekt erstellen
              </Button>
            </div>

            <div className="relative">
              <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Wissensobjekt suchen..."
                value={objSearch}
                onChange={e => setObjSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredObjects.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <IconBrain size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {availableObjects.length === 0
                    ? 'Alle Wissensobjekte wurden bereits hinzugefügt.'
                    : 'Keine Ergebnisse gefunden.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredObjects.map(obj => (
                  <div
                    key={obj.record_id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate min-w-0">
                          {obj.fields.title ?? '(Ohne Titel)'}
                        </span>
                        {obj.fields.phase && (
                          <StatusBadge statusKey={obj.fields.phase.key} label={obj.fields.phase.label} />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {obj.fields.knowledge_type && (
                          <span>{obj.fields.knowledge_type.label}</span>
                        )}
                        {obj.fields.quality_score !== undefined && (
                          <span>Qualität: <span className="font-medium text-foreground">{obj.fields.quality_score}</span></span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={addingNodeId === obj.record_id}
                      onClick={() => handleAddNode(obj)}
                      className="shrink-0 gap-1.5"
                    >
                      {addingNodeId === obj.record_id ? (
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

          <WissensobjekteDialog
            open={objDialogOpen}
            onClose={() => setObjDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createWissensobjekteEntry(fields);
              await fetchAll();
              setObjDialogOpen(false);
            }}
            defaultValues={undefined}
            benutzerrollenList={benutzerrollen}
            enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Wissensobjekte']}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(3)} disabled={mapNodes.length === 0} className="gap-1.5">
              Weiter zu Verlinkungen
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Verlinkungen erstellen ── */}
      {currentStep === 3 && selectedMap && (
        <div className="space-y-5">
          {/* Map + stats header */}
          <div className="flex items-start gap-3 p-4 rounded-xl border bg-card overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconNetwork size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Verlinkungen für</p>
              <p className="font-semibold truncate">{selectedMap.fields.map_title ?? '(Ohne Titel)'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{mapNodes.length} Knoten auf dieser Karte</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-2xl font-bold text-primary">{mapLinks.length}</span>
              <p className="text-xs text-muted-foreground">Verlinkungen gesamt</p>
            </div>
          </div>

          {/* Nodes on map — context */}
          {mapNodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Knoten auf dieser Karte
              </p>
              <div className="flex flex-wrap gap-2">
                {mapNodes.map(kn => {
                  const label = kn.fields.node_label ?? getObjLabel(kn.fields.mn_item);
                  return (
                    <span
                      key={kn.record_id}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-xs font-medium"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create new link */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Erstelle Verlinkungen zwischen den Wissensobjekten auf dieser Karte.
            </p>
            <Button
              onClick={() => setLinkDialogOpen(true)}
              className="gap-1.5 shrink-0"
            >
              <IconPlus size={15} />
              Neue Verlinkung erstellen
            </Button>
          </div>

          <ObjektVerlinkungenDialog
            open={linkDialogOpen}
            onClose={() => setLinkDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createObjektVerlinkungenEntry(fields);
              setSessionLinkCount(prev => prev + 1);
              await fetchAll();
              setLinkDialogOpen(false);
            }}
            defaultValues={
              firstNodeItemUrl
                ? {
                    item_from: firstNodeItemUrl,
                    il_created_at: getCurrentDateTimeMinute(),
                  }
                : {
                    il_created_at: getCurrentDateTimeMinute(),
                  }
            }
            wissensobjekteList={wissensobjekte}
            benutzerrollenList={benutzerrollen}
            enablePhotoScan={AI_PHOTO_SCAN['ObjektVerlinkungen']}
            enablePhotoLocation={AI_PHOTO_LOCATION['ObjektVerlinkungen']}
          />

          {/* Existing links */}
          {mapLinks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Bestehende Verlinkungen ({mapLinks.length})
              </p>
              <div className="space-y-2 overflow-x-auto">
                {mapLinks.map(link => (
                  <div
                    key={link.record_id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate min-w-0">
                        {getObjLabel(link.fields.item_from)}
                      </span>
                      <IconArrowRight size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate min-w-0">
                        {getObjLabel(link.fields.item_to)}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {link.fields.link_type && (
                        <StatusBadge statusKey={link.fields.link_type.key} label={link.fields.link_type.label} />
                      )}
                      {link.fields.link_strength !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          Stärke: <span className="font-medium text-foreground">{link.fields.link_strength}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <IconNetwork size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Noch keine Verlinkungen vorhanden. Erstelle die erste Verlinkung.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(4)} className="gap-1.5">
              Zur Zusammenfassung
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Zusammenfassung ── */}
      {currentStep === 4 && selectedMap && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <IconCheck size={32} className="text-green-600" stroke={2.5} />
            </div>
            <h2 className="text-xl font-bold">Karte erfolgreich befüllt!</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Du hast Wissensobjekte zu deiner Karte hinzugefügt und miteinander verlinkt.
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border bg-card overflow-hidden text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <IconMap size={20} className="text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Karte</p>
              <p className="font-semibold text-sm truncate">{selectedMap.fields.map_title ?? '(Ohne Titel)'}</p>
              {selectedMap.fields.map_type?.label && (
                <p className="text-xs text-muted-foreground mt-0.5">{selectedMap.fields.map_type.label}</p>
              )}
            </div>

            <div className="p-5 rounded-2xl border bg-card overflow-hidden text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <IconBrain size={20} className="text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">Knoten auf der Karte</p>
              <p className="text-3xl font-bold text-primary">{mapNodes.length}</p>
            </div>

            <div className="p-5 rounded-2xl border bg-card overflow-hidden text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <IconNetwork size={20} className="text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">In dieser Session verlinkt</p>
              <p className="text-3xl font-bold text-purple-600">{sessionLinkCount}</p>
            </div>
          </div>

          {/* Summary of nodes */}
          {mapNodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Knoten auf dieser Karte
              </p>
              <div className="space-y-1.5">
                {mapNodes.map(kn => {
                  const itemId = extractRecordId(kn.fields.mn_item);
                  const obj = itemId ? wissensobjekte.find(o => o.record_id === itemId) : null;
                  return (
                    <div key={kn.record_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm overflow-hidden">
                      <IconCheck size={14} className="text-green-600 shrink-0" />
                      <span className="truncate min-w-0">{obj?.fields.title ?? kn.fields.node_label ?? '–'}</span>
                      {obj?.fields.phase && (
                        <StatusBadge statusKey={obj.fields.phase.key} label={obj.fields.phase.label} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-1.5">
              <IconArrowLeft size={15} />
              Zurück zu Verlinkungen
            </Button>
            <Button onClick={handleReset} className="gap-1.5 sm:ml-auto">
              <IconRefresh size={15} />
              Weitere Karte bearbeiten
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
