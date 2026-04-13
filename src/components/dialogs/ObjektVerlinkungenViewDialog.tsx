import type { ObjektVerlinkungen, Wissensobjekte, Benutzerrollen } from '@/types/app';
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

interface ObjektVerlinkungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: ObjektVerlinkungen | null;
  onEdit: (record: ObjektVerlinkungen) => void;
  wissensobjekteList: Wissensobjekte[];
  benutzerrollenList: Benutzerrollen[];
}

export function ObjektVerlinkungenViewDialog({ open, onClose, record, onEdit, wissensobjekteList, benutzerrollenList }: ObjektVerlinkungenViewDialogProps) {
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
          <DialogTitle>Objekt-Verlinkungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausgangs-Wissensobjekt</Label>
            <p className="text-sm">{getWissensobjekteDisplayName(record.fields.item_from)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ziel-Wissensobjekt</Label>
            <p className="text-sm">{getWissensobjekteDisplayName(record.fields.item_to)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Typ der Verknüpfung</Label>
            <Badge variant="secondary">{record.fields.link_type?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stärke der Beziehung (optional)</Label>
            <p className="text-sm">{record.fields.link_strength ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellungszeitpunkt</Label>
            <p className="text-sm">{formatDate(record.fields.il_created_at)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellt von</Label>
            <p className="text-sm">{getBenutzerrollenDisplayName(record.fields.il_created_by)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Begründung der Verlinkung (optional)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.link_justification ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}