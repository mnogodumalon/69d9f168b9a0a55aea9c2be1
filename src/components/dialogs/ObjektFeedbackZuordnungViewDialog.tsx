import type { ObjektFeedbackZuordnung, Wissensobjekte, FeedbackUndVersionen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface ObjektFeedbackZuordnungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: ObjektFeedbackZuordnung | null;
  onEdit: (record: ObjektFeedbackZuordnung) => void;
  wissensobjekteList: Wissensobjekte[];
  feedback_und_versionenList: FeedbackUndVersionen[];
}

export function ObjektFeedbackZuordnungViewDialog({ open, onClose, record, onEdit, wissensobjekteList, feedback_und_versionenList }: ObjektFeedbackZuordnungViewDialogProps) {
  function getWissensobjekteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return wissensobjekteList.find(r => r.record_id === id)?.fields.title ?? '—';
  }

  function getFeedbackUndVersionenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return feedback_und_versionenList.find(r => r.record_id === id)?.fields.version_number ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Objekt-Feedback-Zuordnung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wissensobjekt</Label>
            <p className="text-sm">{getWissensobjekteDisplayName(record.fields.if_knowledge_item)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Feedback / Version</Label>
            <p className="text-sm">{getFeedbackUndVersionenDisplayName(record.fields.if_feedback_version)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rolle des Feedback-Gebers im Kontext dieses Objekts</Label>
            <Badge variant="secondary">{record.fields.if_giver_role?.label ?? '—'}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}