import { memo } from "react";
import { X, GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isCarImageStorageUrl } from "@collection/shared";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface PhotoStripProps {
  /** Ordered photo URLs. photos[0] is the cover. */
  photos: string[];
  /** Called with the FULL new order after a drag. */
  onReorder: (next: string[]) => void;
  /** Called with the URL to remove. */
  onRemove: (url: string) => void;
}

const fileLabel = (url: string) => (isCarImageStorageUrl(url) ? "Uploaded" : "External URL");

function SortableRow({ url, index, onRemove }: { url: string; index: number; onRemove: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.65 : 1, zIndex: isDragging ? 20 : undefined }}
      className="flex items-center gap-1.5 rounded bg-white"
    >
      {/* Drag handle. touch-none so a touch-drag reorders instead of scrolling. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 text-ink-40 hover:text-noir"
      >
        <GripVertical size={14} />
      </button>
      <span
        className={`shrink-0 w-12 text-center rounded px-1 py-0.5 ${index === 0 ? "bg-accent/15 text-noir" : "text-ink-40"}`}
        style={{ fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        {index === 0 ? "Cover" : index + 1}
      </span>
      <div className="shrink-0 h-11 w-16 overflow-hidden rounded border border-border bg-platinum-soft">
        {/* lazy + async decode: with a scrollable strip only the visible thumbnails
            download/decode, and decode never blocks typing. (These are full-res
            originals — Supabase image transforms aren't enabled on this project, so
            genuine small thumbnails would need that Pro feature or an upload-time
            thumbnail pipeline.) */}
        <ImageWithFallback src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      </div>
      <span className="flex-1 truncate text-ink-40" style={{ fontSize: "0.72rem" }}>{fileLabel(url)}</span>
      <button
        type="button"
        onClick={() => onRemove(url)}
        aria-label="Remove photo"
        className="shrink-0 p-1.5 rounded text-ink-60 hover:text-signal-red"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * The uploaded-photos reorder list, drag-and-drop on mouse, touch and keyboard.
 *
 * memo()'d so unrelated form edits (typing a price, toggling published) don't
 * re-render — and therefore don't re-reconcile — the image rows. The parent keeps
 * `photos` a stable reference and the handlers stable (useCallback), so a keystroke
 * skips this subtree entirely. Rows are keyed by URL, so a reorder moves a node
 * rather than remounting it (no image re-decode on reorder either).
 */
export const PhotoStrip = memo(function PhotoStrip({ photos, onReorder, onRemove }: PhotoStripProps) {
  const sensors = useSensors(
    // Mouse: a small drag threshold so a click (remove/handle) isn't a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press-and-hold to grab, so a normal scroll gesture still scrolls.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    // Keyboard: focus a handle, Space to lift, arrows to move, Space to drop.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = photos.indexOf(String(active.id));
    const to = photos.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(photos, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={photos} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {photos.map((url, i) => (
            <SortableRow key={url} url={url} index={i} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});
