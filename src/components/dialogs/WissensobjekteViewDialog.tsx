import type { Wissensobjekte, Benutzerrollen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WissensobjekteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Wissensobjekte | null;
  onEdit: (record: Wissensobjekte) => void;
  benutzerrollenList: Benutzerrollen[];
}

export function WissensobjekteViewDialog({ open, onClose, record, onEdit, benutzerrollenList }: WissensobjekteViewDialogProps) {
  function getBenutzerrollenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return benutzerrollenList.find(r => r.record_id === id)?.fields.firstname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wissensobjekte anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel</Label>
            <p className="text-sm">{record.fields.title ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vollständiger Inhalt</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.content ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktuelle Phase</Label>
            <Badge variant="secondary">{record.fields.phase?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wissenstyp</Label>
            <Badge variant="secondary">{record.fields.knowledge_type?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Qualitätsbewertung (Score)</Label>
            <p className="text-sm">{record.fields.quality_score ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">KI-generierte Zusammenfassung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ai_summary ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Log der Tacit-Knowledge-Extraktion</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.tacit_extraction_log ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Version</Label>
            <p className="text-sm">{record.fields.version ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Autor</Label>
            <p className="text-sm">{getBenutzerrollenDisplayName(record.fields.author)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kurator</Label>
            <p className="text-sm">{getBenutzerrollenDisplayName(record.fields.curator)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">KI-Unterstützung aktiv</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.ai_support ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.ai_support ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zuletzt geändert am</Label>
            <p className="text-sm">{formatDate(record.fields.last_modified)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anwendungsnachweise</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.application_evidence ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anhang / Dokument</Label>
            {record.fields.attachment ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.attachment} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}