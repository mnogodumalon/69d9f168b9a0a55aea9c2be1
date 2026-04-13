import type { Wissenslandkarten, Benutzerrollen } from '@/types/app';
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

interface WissenslandkartenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Wissenslandkarten | null;
  onEdit: (record: Wissenslandkarten) => void;
  benutzerrollenList: Benutzerrollen[];
}

export function WissenslandkartenViewDialog({ open, onClose, record, onEdit, benutzerrollenList }: WissenslandkartenViewDialogProps) {
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
          <DialogTitle>Wissenslandkarten anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titel der Wissenslandkarte</Label>
            <p className="text-sm">{record.fields.map_title ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ der Landkarte</Label>
            <Badge variant="secondary">{record.fields.map_type?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.map_description ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nodes-Daten</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.nodes_data ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Edges-Daten</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.edges_data ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Layout-Daten</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.layout_data ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellt von</Label>
            <p className="text-sm">{getBenutzerrollenDisplayName(record.fields.map_creator)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.map_created_at)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}