import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { WissensobjekteDialog } from '@/components/dialogs/WissensobjekteDialog';
import { FeedbackUndVersionenDialog } from '@/components/dialogs/FeedbackUndVersionenDialog';
import { ObjektVerlinkungenDialog } from '@/components/dialogs/ObjektVerlinkungenDialog';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Wissensobjekte } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconStar,
  IconStarFilled,
  IconLink,
  IconPlus,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconBook,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Auswählen' },
  { label: 'Prüfen & Bewerten' },
  { label: 'Verlinken' },
  { label: 'Phase & Abschluss' },
];

const phaseOptions = LOOKUP_OPTIONS['wissensobjekte']?.phase ?? [];
const linkTypeOptions = LOOKUP_OPTIONS['objekt_verlinkungen']?.link_type ?? [];

interface LinkEntry {
  targetId: string;
  targetTitle: string;
  linkType: string;
  linkStrength: number;
}

export default function WissensobjektKurierenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { wissensobjekte, benutzerrollen, loading, error, fetchAll } = useDashboardData();

  // Step state — init from URL
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  });

  // Step 1: selection
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('wissensobjektId'));
  const [newWissensobjektOpen, setNewWissensobjektOpen] = useState(false);

  // Step 2: review
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [newFeedbackOpen, setNewFeedbackOpen] = useState(false);

  // Step 3: links
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<string>(linkTypeOptions[0]?.key ?? 'related');
  const [linkStrength, setLinkStrength] = useState<number>(5);
  const [createdLinks, setCreatedLinks] = useState<LinkEntry[]>([]);
  const [savingLink, setSavingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [newLinkOpen, setNewLinkOpen] = useState(false);

  // Step 4: phase
  const [newPhase, setNewPhase] = useState<string>('');
  const [savingPhase, setSavingPhase] = useState(false);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [phaseUpdated, setPhaseUpdated] = useState(false);

  // Sync wissensobjektId URL param when selection changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (selectedId) {
      params.set('wissensobjektId', selectedId);
    } else {
      params.delete('wissensobjektId');
    }
    setSearchParams(params, { replace: true });
  }, [selectedId, searchParams, setSearchParams]);

  // Pre-select from URL param after data loads
  useEffect(() => {
    const urlId = searchParams.get('wissensobjektId');
    if (urlId && wissensobjekte.length > 0) {
      const found = wissensobjekte.find(w => w.record_id === urlId);
      if (found) setSelectedId(urlId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wissensobjekte]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const selectedObj = wissensobjekte.find(w => w.record_id === selectedId) ?? null;

  // Derive author name from benutzerrollen
  const authorRecord = selectedObj
    ? benutzerrollen.find(b => b.record_id === extractRecordId(selectedObj.fields.author))
    : null;
  const authorName = authorRecord
    ? `${authorRecord.fields.firstname ?? ''} ${authorRecord.fields.lastname ?? ''}`.trim()
    : '—';

  // Version number derived from current version string
  function nextVersionNumber(version: string | undefined): string {
    if (!version) return '1.0';
    const num = parseFloat(version);
    if (isNaN(num)) return version;
    return (Math.round((num + 0.1) * 10) / 10).toFixed(1);
  }

  // Step 2: save feedback
  async function handleSaveFeedback() {
    if (!selectedObj) return;
    setSavingFeedback(true);
    setFeedbackError(null);
    try {
      await LivingAppsService.createFeedbackUndVersionenEntry({
        related_item: createRecordUrl(APP_IDS.WISSENSOBJEKTE, selectedObj.record_id),
        version_number: nextVersionNumber(selectedObj.fields.version),
        change_type: 'feedback',
        feedback_text: feedbackText,
        rating: rating,
        timestamp: new Date().toISOString().slice(0, 16),
      });
      await fetchAll();
      setCurrentStep(3);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSavingFeedback(false);
    }
  }

  // Step 3: add a link
  async function handleAddLink() {
    if (!selectedObj || !linkTarget) return;
    setSavingLink(true);
    setLinkError(null);
    try {
      await LivingAppsService.createObjektVerlinkungenEntry({
        item_from: createRecordUrl(APP_IDS.WISSENSOBJEKTE, selectedObj.record_id),
        item_to: createRecordUrl(APP_IDS.WISSENSOBJEKTE, linkTarget),
        link_type: linkType,
        link_strength: linkStrength,
        il_created_at: new Date().toISOString().slice(0, 16),
      });
      const targetObj = wissensobjekte.find(w => w.record_id === linkTarget);
      setCreatedLinks(prev => [
        ...prev,
        {
          targetId: linkTarget,
          targetTitle: targetObj?.fields.title ?? linkTarget,
          linkType,
          linkStrength,
        },
      ]);
      setLinkTarget(null);
      setLinkStrength(5);
      setLinkType(linkTypeOptions[0]?.key ?? 'related');
      await fetchAll();
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Fehler beim Verlinken');
    } finally {
      setSavingLink(false);
    }
  }

  // Step 4: update phase
  async function handleUpdatePhase() {
    if (!selectedObj || !newPhase) return;
    setSavingPhase(true);
    setPhaseError(null);
    try {
      await LivingAppsService.updateWissensobjekteEntry(selectedObj.record_id, {
        phase: newPhase,
      });
      await fetchAll();
      setPhaseUpdated(true);
    } catch (e) {
      setPhaseError(e instanceof Error ? e.message : 'Fehler beim Aktualisieren');
    } finally {
      setSavingPhase(false);
    }
  }

  function handleReset() {
    setSelectedId(null);
    setRating(0);
    setFeedbackText('');
    setFeedbackError(null);
    setLinkTarget(null);
    setLinkType(linkTypeOptions[0]?.key ?? 'related');
    setLinkStrength(5);
    setCreatedLinks([]);
    setLinkError(null);
    setNewPhase('');
    setPhaseError(null);
    setPhaseUpdated(false);
    setCurrentStep(1);
  }

  // Other objects for linking (exclude current)
  const otherObjects = wissensobjekte.filter(w => w.record_id !== selectedId);

  // Proposed new score based on rating (average of current + rating * 20)
  const currentScore = selectedObj?.fields.quality_score ?? 0;
  const proposedScore = rating > 0
    ? Math.round((currentScore + rating * 20) / 2)
    : currentScore;

  return (
    <IntentWizardShell
      title="Wissensobjekt kuratieren"
      subtitle="Prüfe, bewerte und verlinke ein Wissensobjekt in einem geführten Workflow."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Auswählen ───────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Welches Wissensobjekt möchtest du kuratieren?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle ein Objekt aus der Liste oder erstelle ein neues.
            </p>
          </div>

          <EntitySelectStep
            items={wissensobjekte.map(w => ({
              id: w.record_id,
              title: w.fields.title ?? '(kein Titel)',
              subtitle: [
                (w.fields.phase as { key: string; label: string } | undefined)?.label,
                (w.fields.knowledge_type as { key: string; label: string } | undefined)?.label,
              ]
                .filter(Boolean)
                .join(' · '),
              status: w.fields.phase as { key: string; label: string } | undefined,
              stats: [
                { label: 'Qualität', value: w.fields.quality_score ?? 0 },
                { label: 'Version', value: w.fields.version ?? '—' },
              ],
              icon: <IconBook size={18} className="text-primary" />,
            }))}
            onSelect={id => {
              setSelectedId(id);
            }}
            searchPlaceholder="Wissensobjekt suchen..."
            emptyText="Kein Wissensobjekt gefunden."
            createLabel="Neues Objekt erstellen"
            onCreateNew={() => setNewWissensobjektOpen(true)}
            createDialog={
              <WissensobjekteDialog
                open={newWissensobjektOpen}
                onClose={() => setNewWissensobjektOpen(false)}
                onSubmit={async fields => {
                  const result = await LivingAppsService.createWissensobjekteEntry(fields as Wissensobjekte['fields']);
                  await fetchAll();
                  if (result?.id) setSelectedId(result.id);
                }}
                benutzerrollenList={benutzerrollen}
                enablePhotoScan={AI_PHOTO_SCAN['Wissensobjekte']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Wissensobjekte']}
              />
            }
          />

          {selectedObj && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5 overflow-hidden">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Ausgewählt</p>
                <p className="font-medium truncate">{selectedObj.fields.title ?? '(kein Titel)'}</p>
              </div>
              <Button onClick={() => setCurrentStep(2)} className="shrink-0 gap-2 ml-3">
                Weiter
                <IconArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Prüfen & Bewerten ───────────────────────────────── */}
      {currentStep === 2 && selectedObj && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Objekt prüfen &amp; bewerten</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Lies den Inhalt und gib deine Bewertung ab.
            </p>
          </div>

          {/* Object detail card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-start gap-2">
                <h3 className="font-semibold text-base flex-1 min-w-0 truncate">
                  {selectedObj.fields.title ?? '(kein Titel)'}
                </h3>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {selectedObj.fields.phase && (
                    <StatusBadge
                      statusKey={(selectedObj.fields.phase as { key: string; label: string }).key}
                      label={(selectedObj.fields.phase as { key: string; label: string }).label}
                    />
                  )}
                  {selectedObj.fields.knowledge_type && (
                    <StatusBadge
                      statusKey={(selectedObj.fields.knowledge_type as { key: string; label: string }).key}
                      label={(selectedObj.fields.knowledge_type as { key: string; label: string }).label}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Qualitätsscore</span>
                  <p className="font-medium">{selectedObj.fields.quality_score ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Version</span>
                  <p className="font-medium">{selectedObj.fields.version ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Autor</span>
                  <p className="font-medium truncate">{authorName}</p>
                </div>
              </div>

              {selectedObj.fields.content && (
                <div>
                  <span className="text-muted-foreground text-xs">Inhalt</span>
                  <p className="text-sm mt-1 line-clamp-4 text-foreground">{selectedObj.fields.content}</p>
                </div>
              )}

              {selectedObj.fields.ai_summary && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground text-xs font-medium">KI-Zusammenfassung</span>
                  <p className="text-sm mt-1 line-clamp-3">{selectedObj.fields.ai_summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Bewertung (1–5 Sterne)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1 rounded transition-colors hover:text-yellow-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`${n} Stern${n > 1 ? 'e' : ''}`}
                >
                  {n <= rating ? (
                    <IconStarFilled size={28} className="text-yellow-400" />
                  ) : (
                    <IconStar size={28} className="text-muted-foreground" />
                  )}
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => setRating(0)}
                  className="text-xs text-muted-foreground underline self-center ml-1"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>

          {/* Feedback text */}
          <div className="space-y-2">
            <Label htmlFor="feedback-text">Feedback-Text</Label>
            <Textarea
              id="feedback-text"
              placeholder="Dein strukturiertes Feedback zum Objekt..."
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={4}
              className="w-full"
            />
          </div>

          {/* Live score preview */}
          {rating > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40 text-sm">
              <span className="text-muted-foreground">Aktueller Score:</span>
              <span className="font-semibold">{currentScore}</span>
              <IconArrowRight size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Vorgeschlagener Score:</span>
              <span className="font-bold text-primary">{proposedScore}</span>
            </div>
          )}

          {feedbackError && (
            <p className="text-sm text-destructive">{feedbackError}</p>
          )}

          <div className="flex flex-wrap gap-3 justify-between pt-1">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setNewFeedbackOpen(true);
                }}
              >
                <IconPlus size={15} className="mr-1" />
                Neues Feedback-Formular
              </Button>
              <Button
                onClick={handleSaveFeedback}
                disabled={savingFeedback || rating === 0}
                className="gap-2"
              >
                {savingFeedback ? 'Speichert...' : 'Feedback speichern'}
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>

          <FeedbackUndVersionenDialog
            open={newFeedbackOpen}
            onClose={() => setNewFeedbackOpen(false)}
            onSubmit={async fields => {
              await LivingAppsService.createFeedbackUndVersionenEntry(fields);
              await fetchAll();
              setNewFeedbackOpen(false);
            }}
            wissensobjekteList={wissensobjekte}
            benutzerrollenList={benutzerrollen}
            enablePhotoScan={AI_PHOTO_SCAN['FeedbackUndVersionen']}
            enablePhotoLocation={AI_PHOTO_LOCATION['FeedbackUndVersionen']}
          />
        </div>
      )}

      {/* ── Step 3: Verlinkungen ────────────────────────────────────── */}
      {currentStep === 3 && selectedObj && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Verlinkungen erstellen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verknüpfe dieses Objekt mit verwandten Wissensobjekten.
              </p>
            </div>
            {createdLinks.length > 0 && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full shrink-0">
                <IconLink size={14} />
                {createdLinks.length} Verlinkung{createdLinks.length !== 1 ? 'en' : ''}
              </div>
            )}
          </div>

          {/* Pick link target */}
          <div>
            <Label className="mb-2 block">Zielobjekt auswählen</Label>
            <EntitySelectStep
              items={otherObjects.map(w => ({
                id: w.record_id,
                title: w.fields.title ?? '(kein Titel)',
                subtitle: (w.fields.phase as { key: string; label: string } | undefined)?.label,
                status: w.fields.phase as { key: string; label: string } | undefined,
                stats: [{ label: 'Qualität', value: w.fields.quality_score ?? 0 }],
                icon: <IconBook size={16} className="text-primary" />,
              }))}
              onSelect={id => setLinkTarget(id)}
              searchPlaceholder="Zielobjekt suchen..."
              emptyText="Keine weiteren Wissensobjekte gefunden."
              createLabel="Neues Objekt erstellen"
              onCreateNew={() => setNewLinkOpen(true)}
              createDialog={
                <ObjektVerlinkungenDialog
                  open={newLinkOpen}
                  onClose={() => setNewLinkOpen(false)}
                  onSubmit={async fields => {
                    await LivingAppsService.createObjektVerlinkungenEntry(fields);
                    await fetchAll();
                    setNewLinkOpen(false);
                  }}
                  wissensobjekteList={wissensobjekte}
                  benutzerrollenList={benutzerrollen}
                  enablePhotoScan={AI_PHOTO_SCAN['ObjektVerlinkungen']}
                  enablePhotoLocation={AI_PHOTO_LOCATION['ObjektVerlinkungen']}
                />
              }
            />
          </div>

          {/* Link options when a target is selected */}
          {linkTarget && (
            <div className="rounded-xl border bg-card p-4 space-y-4 overflow-hidden">
              <p className="font-medium text-sm">
                Verlinken mit:{' '}
                <span className="text-primary">
                  {wissensobjekte.find(w => w.record_id === linkTarget)?.fields.title ?? linkTarget}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Verknüpfungstyp</Label>
                  <Select value={linkType} onValueChange={setLinkType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
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

                <div className="space-y-1">
                  <Label>Stärke: {linkStrength}</Label>
                  <Input
                    type="range"
                    min={1}
                    max={10}
                    value={linkStrength}
                    onChange={e => setLinkStrength(Number(e.target.value))}
                    className="w-full cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Schwach (1)</span>
                    <span>Stark (10)</span>
                  </div>
                </div>
              </div>

              {linkError && <p className="text-sm text-destructive">{linkError}</p>}

              <Button
                onClick={handleAddLink}
                disabled={savingLink}
                className="gap-2"
              >
                <IconPlus size={15} />
                {savingLink ? 'Verlinke...' : 'Verlinkung hinzufügen'}
              </Button>
            </div>
          )}

          {/* Created links so far */}
          {createdLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Erstellte Verlinkungen</p>
              {createdLinks.map((lnk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 overflow-hidden"
                >
                  <IconCheck size={16} className="text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lnk.targetTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {linkTypeOptions.find(o => o.key === lnk.linkType)?.label ?? lnk.linkType} · Stärke {lnk.linkStrength}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-between pt-1">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setCurrentStep(4)}>
                Weiter ohne Verlinkung
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={createdLinks.length === 0}
                className="gap-2"
              >
                Verlinkungen abschliessen
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Phase & Abschluss ───────────────────────────────── */}
      {currentStep === 4 && selectedObj && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Phase weitersetzen &amp; abschliessen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Aktualisiere die Phase des Wissensobjekts und schliesse die Kuration ab.
            </p>
          </div>

          {/* Current phase */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Aktuelle Phase:</span>
            {selectedObj.fields.phase ? (
              <StatusBadge
                statusKey={(selectedObj.fields.phase as { key: string; label: string }).key}
                label={(selectedObj.fields.phase as { key: string; label: string }).label}
              />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>

          {/* New phase selector */}
          {!phaseUpdated && (
            <div className="space-y-2">
              <Label htmlFor="new-phase">Neue Phase</Label>
              <Select value={newPhase} onValueChange={setNewPhase}>
                <SelectTrigger id="new-phase" className="w-full max-w-xs">
                  <SelectValue placeholder="Phase auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {phaseError && <p className="text-sm text-destructive">{phaseError}</p>}

              <Button
                onClick={handleUpdatePhase}
                disabled={savingPhase || !newPhase}
                className="gap-2"
              >
                {savingPhase ? 'Aktualisiert...' : 'Phase aktualisieren'}
                <IconCheck size={16} />
              </Button>
            </div>
          )}

          {phaseUpdated && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <IconCheck size={16} className="shrink-0" />
              Phase wurde erfolgreich auf{' '}
              <strong>{phaseOptions.find(o => o.key === newPhase)?.label ?? newPhase}</strong>{' '}
              gesetzt.
            </div>
          )}

          {/* Summary card */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="font-semibold text-sm">Zusammenfassung der Kuration</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">1</p>
                <p className="text-xs text-muted-foreground mt-1">Feedback erstellt</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{createdLinks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verlinkung{createdLinks.length !== 1 ? 'en' : ''} erstellt
                </p>
              </div>
              <div className="text-center">
                {phaseUpdated ? (
                  <>
                    <StatusBadge
                      statusKey={newPhase}
                      label={phaseOptions.find(o => o.key === newPhase)?.label ?? newPhase}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Neue Phase</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground mt-1">Phase noch offen</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-between pt-1">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button onClick={handleReset} className="gap-2">
              <IconRefresh size={16} />
              Neues Objekt kuratieren
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
