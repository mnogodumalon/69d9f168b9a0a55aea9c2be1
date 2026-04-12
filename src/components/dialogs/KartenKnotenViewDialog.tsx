import type { KartenKnoten, Wissenslandkarten, Wissensobjekte, Benutzerrollen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface KartenKnotenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: KartenKnoten | null;
  onEdit: (record: KartenKnoten) => void;
  wissenslandkartenList: Wissenslandkarten[];
  wissensobjekteList: Wissensobjekte[];
  benutzerrollenList: Benutzerrollen[];
}

export function KartenKnotenViewDialog({ open, onClose, record, onEdit, wissenslandkartenList, wissensobjekteList, benutzerrollenList }: KartenKnotenViewDialogProps) {
  function getWissenslandkartenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return wissenslandkartenList.find(r => r.record_id === id)?.fields.map_title ?? '—';
  }

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
          <DialogTitle>Karten-Knoten anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wissenslandkarte</Label>
            <p className="text-sm">{getWissenslandkartenDisplayName(record.fields.mn_map)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wissensobjekt (Node)</Label>
            <p className="text-sm">{getWissensobjekteDisplayName(record.fields.mn_item)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Position X (Koordinate)</Label>
            <p className="text-sm">{record.fields.pos_x ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Position Y (Koordinate)</Label>
            <p className="text-sm">{record.fields.pos_y ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Layout-Daten des Knotens</Label>
            <p className="text-sm">{record.fields.node_layout_data ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Angezeigter Label auf der Karte (optional)</Label>
            <p className="text-sm">{record.fields.node_label ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zeitpunkt der Hinzufügung</Label>
            <p className="text-sm">{formatDate(record.fields.mn_added_at)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinzugefügt von</Label>
            <p className="text-sm">{getBenutzerrollenDisplayName(record.fields.mn_added_by)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}