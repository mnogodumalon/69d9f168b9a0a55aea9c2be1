import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { FeedbackUndVersionenDialog } from '@/components/dialogs/FeedbackUndVersionenDialog';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { EnrichedWissensobjekte, EnrichedFeedbackUndVersionen } from '@/types/enriched';
import type { FeedbackUndVersionen } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  IconBook,
  IconPlus,
  IconMessageCircle,
  IconStar,
  IconCheck,
  IconRefresh,
  IconAlertCircle,
  IconChevronRight,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Objekt wählen' },
  { label: 'Feedback' },
  { label: 'Qualität & Phase' },
  { label: 'Zusammenfassung' },
];

function getNowDatetimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function KuratiereWissensobjektPage() {
  const [searchParams] = useSearchParams();
  const { wissensobjekte, feedbackUndVersionen, benutzerrollen, loading, error, fetchAll } = useDashboardData();

  // Step state — initialized from URL on mount via IntentWizardShell
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 4 ? urlStep : 1;
  });

  // Step 1
  const [selectedObj, setSelectedObj] = useState<EnrichedWissensobjekte | null>(null);
  const [wissensobjekteDialogOpen, setWissensobjekteDialogOpen] = useState(false);

  // Step 2
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<EnrichedFeedbackUndVersionen[]>([]);

  // Step 3
  const [qualityScore, setQualityScore] = useState<string>('');
  const [phase, setPhase] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string>('');

  // Deep-link: pre-select object from URL param
  useEffect(() => {
    const objId = searchParams.get('wissensobjektId');
    if (objId && wissensobjekte.length > 0 && !selectedObj) {
      const found = wissensobjekte.find(w => w.record_id === objId) as EnrichedWissensobjekte | undefined;
      if (found) setSelectedObj(found);
    }
  }, [searchParams, wissensobjekte, selectedObj]);

  // When an object is selected, pre-populate step 3 fields
  useEffect(() => {
    if (selectedObj) {
      setQualityScore(selectedObj.fields.quality_score != null ? String(selectedObj.fields.quality_score) : '');
      setPhase(
        selectedObj.fields.phase
          ? (typeof selectedObj.fields.phase === 'object' ? selectedObj.fields.phase.key : selectedObj.fields.phase)
          : ''
      );
      setVersion(selectedObj.fields.version ?? '');
      setSaveStatus('idle');
      setSaveError('');
    }
  }, [selectedObj]);

  // Feedback for selected object (existing + session)
  const existingFeedback: EnrichedFeedbackUndVersionen[] = (feedbackUndVersionen as EnrichedFeedbackUndVersionen[]).filter(fb => {
    if (!selectedObj) return false;
    const relatedId = extractRecordId(fb.fields.related_item);
    return relatedId === selectedObj.record_id;
  });

  const fetchFeedback = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  function handleSelectObject(id: string) {
    const found = wissensobjekte.find(w => w.record_id === id) as EnrichedWissensobjekte | undefined;
    if (found) {
      setSelectedObj(found);
      setSessionFeedback([]);
      setCurrentStep(2);
    }
  }

  async function handleFeedbackSubmit(fields: FeedbackUndVersionen['fields']) {
    const result = await LivingAppsService.createFeedbackUndVersionenEntry(fields);
    await fetchFeedback();
    // Find the newly created record id from result (API returns object with record_id)
    let newFeedbackId: string | undefined;
    if (result && typeof result === 'object') {
      // The API may return the record directly or as a nested object
      const r = result as Record<string, unknown>;
      newFeedbackId = (r['record_id'] as string | undefined) ?? Object.keys(r)[0];
    }
    if (newFeedbackId && selectedObj) {
      // Create Objekt-Feedback-Zuordnung linking item to feedback
      await LivingAppsService.createObjektFeedbackZuordnungEntry({
        if_knowledge_item: createRecordUrl(APP_IDS.WISSENSOBJEKTE, selectedObj.record_id),
        if_feedback_version: createRecordUrl(APP_IDS.FEEDBACK_UND_VERSIONEN, newFeedbackId),
      });
    }
    // Track session feedback
    const refreshed = await LivingAppsService.getFeedbackUndVersionen();
    const latest = refreshed.find(fb => extractRecordId(fb.fields.related_item) === selectedObj?.record_id);
    if (latest) {
      setSessionFeedback(prev => [...prev, latest as EnrichedFeedbackUndVersionen]);
    }
  }

  async function handleSaveQuality() {
    if (!selectedObj) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      await LivingAppsService.updateWissensobjekteEntry(selectedObj.record_id, {
        quality_score: qualityScore !== '' ? Number(qualityScore) : undefined,
        phase: phase || undefined,
        version: version || undefined,
        last_modified: getNowDatetimeLocal(),
      });
      await fetchAll();
      // Refresh selectedObj with updated data
      const refreshed = (await LivingAppsService.getWissensobjekte()).find(
        w => w.record_id === selectedObj.record_id
      ) as EnrichedWissensobjekte | undefined;
      if (refreshed) setSelectedObj(refreshed);
      setSaveStatus('success');
    } catch (e) {
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  }

  function handleReset() {
    setSelectedObj(null);
    setSessionFeedback([]);
    setQualityScore('');
    setPhase('');
    setVersion('');
    setSaveStatus('idle');
    setSaveError('');
    setCurrentStep(1);
  }

  const phaseOptions = LOOKUP_OPTIONS['wissensobjekte']?.['phase'] ?? [];
  const totalFeedbackAdded = sessionFeedback.length;

  return (
    <IntentWizardShell
      title="Wissensobjekt kuratieren"
      subtitle="Wähle ein Objekt aus, füge Feedback hinzu und aktualisiere Qualität und Phase."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Wissensobjekt auswählen ── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Wissensobjekt auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle das Objekt, das du kuratieren möchtest.
            </p>
          </div>
          <EntitySelectStep
            items={wissensobjekte.map(w => ({
              id: w.record_id,
              title: w.fields.title ?? '(Kein Titel)',
              subtitle: w.fields.knowledge_type
                ? (typeof w.fields.knowledge_type === 'object'
                    ? w.fields.knowledge_type.label
                    : w.fields.knowledge_type)
                : undefined,
              status: w.fields.phase
                ? (typeof w.fields.phase === 'object'
                    ? w.fields.phase
                    : { key: w.fields.phase, label: w.fields.phase })
                : undefined,
              stats: w.fields.quality_score != null
                ? [{ label: 'Qualität', value: `${w.fields.quality_score}/100` }]
                : [],
              icon: <IconBook size={18} className="text-primary" stroke={1.5} />,
            }))}
            onSelect={handleSelectObject}
            searchPlaceholder="Wissensobjekte durchsuchen..."
            emptyIcon={<IconBook size={32} />}
            emptyText="Noch keine Wissensobjekte vorhanden."
            createLabel="Neues Wissensobjekt"
            onCreateNew={() => setWissensobjekteDialogOpen(true)}
            createDialog={
              <WissensobjekteDialog
                open={wissensobjekteDialogOpen}
                onClose={() => setWissensobjekteDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createWissensobjekteEntry(fields);
                  await fetchAll();
                  // Auto-select newly created object
                  let newId: string | undefined;
                  if (result && typeof result === 'object') {
                    const r = result as Record<string, unknown>;
                    newId = (r['record_id'] as string | undefined) ?? Object.keys(r)[0];
                  }
                  if (newId) {
                    const refreshed = wissensobjekte.find(w => w.record_id === newId) as EnrichedWissensobjekte | undefined;
                    if (refreshed) {
                      setSelectedObj(refreshed);
                      setCurrentStep(2);
                    }
                  }
                }}
                defaultValues={undefined}
                benutzerrollenList={benutzerrollen}
                enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Wissensobjekte']}
              />
            }
          />
        </div>
      )}

      {/* ── STEP 2: Feedback hinzufügen ── */}
      {currentStep === 2 && selectedObj && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Feedback hinzufügen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Füge Feedback oder eine neue Version zu diesem Wissensobjekt hinzu.
            </p>
          </div>

          {/* Selected object info card */}
          <div className="rounded-xl border bg-card p-4 space-y-2 overflow-hidden">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconBook size={18} className="text-primary" stroke={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selectedObj.fields.title ?? '(Kein Titel)'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedObj.fields.phase && (
                    <StatusBadge
                      statusKey={typeof selectedObj.fields.phase === 'object' ? selectedObj.fields.phase.key : selectedObj.fields.phase}
                      label={typeof selectedObj.fields.phase === 'object' ? selectedObj.fields.phase.label : selectedObj.fields.phase}
                    />
                  )}
                  {selectedObj.fields.quality_score != null && (
                    <span className="text-xs text-muted-foreground">
                      Qualität: <span className="font-medium text-foreground">{selectedObj.fields.quality_score}/100</span>
                    </span>
                  )}
                  {selectedObj.fields.version && (
                    <span className="text-xs text-muted-foreground">
                      Version: <span className="font-medium text-foreground">{selectedObj.fields.version}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Session feedback counter */}
          {totalFeedbackAdded > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <IconCheck size={16} stroke={2.5} />
              {totalFeedbackAdded} Feedback-{totalFeedbackAdded === 1 ? 'Eintrag' : 'Einträge'} in dieser Sitzung hinzugefügt
            </div>
          )}

          {/* Existing feedback list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Vorhandenes Feedback ({existingFeedback.length})
            </p>
            {existingFeedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl">
                Noch kein Feedback für dieses Objekt vorhanden.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {existingFeedback.map(fb => (
                  <div
                    key={fb.record_id}
                    className="rounded-xl border bg-card p-3 space-y-1 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">
                        {fb.fields.change_type
                          ? (typeof fb.fields.change_type === 'object'
                              ? fb.fields.change_type.label
                              : fb.fields.change_type)
                          : 'Feedback'}
                      </span>
                      {fb.fields.version_number && (
                        <span className="text-xs text-muted-foreground">v{fb.fields.version_number}</span>
                      )}
                      {fb.fields.rating != null && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <IconStar size={12} stroke={1.5} />
                          {fb.fields.rating}
                        </span>
                      )}
                    </div>
                    {fb.fields.feedback_text && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{fb.fields.feedback_text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add feedback button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setFeedbackDialogOpen(true)}
          >
            <IconPlus size={16} />
            Neues Feedback / Version erstellen
          </Button>

          <FeedbackUndVersionenDialog
            open={feedbackDialogOpen}
            onClose={() => setFeedbackDialogOpen(false)}
            onSubmit={handleFeedbackSubmit}
            defaultValues={
              selectedObj
                ? { related_item: createRecordUrl(APP_IDS.WISSENSOBJEKTE, selectedObj.record_id) }
                : undefined
            }
            wissensobjekteList={wissensobjekte}
            benutzerrollenList={benutzerrollen}
            enablePhotoScan={AI_PHOTO_SCAN['FeedbackUndVersionen']}
            enablePhotoLocation={AI_PHOTO_LOCATION['FeedbackUndVersionen']}
          />

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-1.5">
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(3)} className="flex-1 gap-1.5">
              Weiter zur Qualitätsbewertung
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Qualität & Phase aktualisieren ── */}
      {currentStep === 3 && selectedObj && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Qualität & Phase aktualisieren</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Passe Qualitätsbewertung, Phase und Version von <strong>{selectedObj.fields.title}</strong> an.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4 overflow-hidden">
            {/* Quality score */}
            <div className="space-y-2">
              <Label htmlFor="quality_score">Qualitätsbewertung (0–100)</Label>
              <Input
                id="quality_score"
                type="number"
                min={0}
                max={100}
                value={qualityScore}
                onChange={e => setQualityScore(e.target.value)}
                placeholder="z.B. 75"
              />
            </div>

            {/* Phase */}
            <div className="space-y-2">
              <Label htmlFor="phase">Phase</Label>
              <Select value={phase || 'none'} onValueChange={v => setPhase(v === 'none' ? '' : v)}>
                <SelectTrigger id="phase">
                  <SelectValue placeholder="Phase auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Keine Auswahl —</SelectItem>
                  {phaseOptions.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Version */}
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="z.B. 1.2"
              />
            </div>
          </div>

          {/* Save status */}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              <IconCheck size={16} stroke={2.5} />
              Erfolgreich gespeichert!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <IconAlertCircle size={16} />
              Fehler beim Speichern: {saveError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              Zurück
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveQuality}
              disabled={saveStatus === 'saving'}
              className="gap-1.5"
            >
              {saveStatus === 'saving' ? (
                <>
                  <IconRefresh size={16} className="animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <IconCheck size={16} />
                  Speichern
                </>
              )}
            </Button>
            <Button
              onClick={() => setCurrentStep(4)}
              className="flex-1 gap-1.5"
              disabled={saveStatus === 'saving'}
            >
              Zur Zusammenfassung
              <IconChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Zusammenfassung ── */}
      {currentStep === 4 && selectedObj && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Zusammenfassung</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Die Kuratierung wurde abgeschlossen.
            </p>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBook size={18} className="text-primary" stroke={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedObj.fields.title ?? '(Kein Titel)'}</p>
                  {selectedObj.fields.knowledge_type && (
                    <p className="text-xs text-muted-foreground truncate">
                      {typeof selectedObj.fields.knowledge_type === 'object'
                        ? selectedObj.fields.knowledge_type.label
                        : selectedObj.fields.knowledge_type}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Phase</p>
                {phase ? (
                  <StatusBadge
                    statusKey={phase}
                    label={phaseOptions.find(o => o.key === phase)?.label ?? phase}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Qualitätsbewertung</p>
                <p className="text-sm font-medium">
                  {qualityScore !== '' ? `${qualityScore}/100` : '—'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-medium">{version || '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Feedback hinzugefügt</p>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <IconMessageCircle size={14} className="text-muted-foreground" stroke={1.5} />
                  {totalFeedbackAdded} {totalFeedbackAdded === 1 ? 'Eintrag' : 'Einträge'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              Zurück
            </Button>
            <Button onClick={handleReset} className="flex-1 gap-1.5">
              <IconRefresh size={16} />
              Weiteres Objekt kuratieren
            </Button>
          </div>
        </div>
      )}

      {/* Fallback if step > 1 but no object selected */}
      {currentStep > 1 && !selectedObj && (
        <div className="text-center py-16 space-y-3">
          <IconBook size={40} className="mx-auto text-muted-foreground opacity-40" stroke={1.5} />
          <p className="text-sm text-muted-foreground">
            Kein Wissensobjekt ausgewählt. Bitte starte erneut.
          </p>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            Zurück zu Schritt 1
          </Button>
        </div>
      )}
    </IntentWizardShell>
  );
}
