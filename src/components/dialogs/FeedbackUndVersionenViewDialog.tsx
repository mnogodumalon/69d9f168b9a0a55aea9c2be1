import type { FeedbackUndVersionen, Wissensobjekte, Benutzerrollen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface FeedbackUndVersionenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: FeedbackUndVersionen | null;
  onEdit: (record: FeedbackUndVersionen) => void;
  wissensobjekteList: Wissensobjekte[];
  benutzerrollenList: Benutzerrollen[];
}

export function FeedbackUndVersionenViewDialog({ open, onClose, record, onEdit, wissensobjekteList, benutzerrollenList }: FeedbackUndVersionenViewDialogProps) {
  function getWissensobjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return wissensobjekteList.find(r => r.record_id === id)?.fields.title ?? '—';
  }

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
          <DialogTitle>Feedback und Versionen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bezug zu Wissensobjekt</Label>
            <p className="text-sm">{getWissensobjekteDisplayName(record.fields.related_item)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Version des Wissensobjekts</Label>
            <p className="text-sm">{record.fields.version_number ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Art der Änderung</Label>
            <Badge variant="secondary">{record.fields.change_type?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Feedback-Text / Inhalts-Snapshot</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.feedback_text ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bewertung (Rating)</Label>
            <p className="text-sm">{record.fields.rating ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zeitstempel</Label>
            <p className="text-sm">{formatDate(record.fields.timestamp)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verantwortliche Person</Label>
            <p className="text-sm">{getBenutzerrollenDisplayName(record.fields.responsible_person)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}