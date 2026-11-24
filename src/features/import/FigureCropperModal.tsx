import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Trash2,
  Crop as CropIcon,
  AlertCircle,
} from 'lucide-react';
import { Modal, Button, Chip } from '../../components/ui';
import {
  BoundingBox,
  CropArea,
  bboxToCropArea,
  cropAreaToBbox,
  cropCanvasRegion,
  saveFigure,
  renderPdfPageToCanvas,
  clamp,
} from './figureCrop';

interface FigureCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (figureData: {
    url: string;
    caption?: string;
    page?: number;
    bbox?: BoundingBox;
  }) => void;
  onRemove?: () => void;
  initialFigure?: {
    url?: string;
    caption?: string;
    page?: number;
    bbox?: BoundingBox;
  } | null;
  userId?: string;
}

export const FigureCropperModal: React.FC<FigureCropperModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRemove,
  initialFigure,
  userId,
}) => {
  const [sourceType, setSourceType] = useState<'none' | 'image' | 'pdf'>('none');
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialFigure?.page || 1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [caption, setCaption] = useState<string>(initialFigure?.caption || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Normalized crop area (0 to 1)
  const [cropArea, setCropArea] = useState<CropArea>(() =>
    bboxToCropArea(initialFigure?.bbox)
  );

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(
    initialFigure?.url || null
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; initialArea: CropArea }>({
    x: 0,
    y: 0,
    initialArea: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
  });

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (initialFigure?.url) {
        setPreviewDataUrl(initialFigure.url);
        setCaption(initialFigure.caption || '');
        if (initialFigure.bbox) {
          setCropArea(bboxToCropArea(initialFigure.bbox));
        }
      }
    }
  }, [isOpen, initialFigure]);

  // Load and render PDF page when buffer or page changes
  useEffect(() => {
    if (sourceType === 'pdf' && pdfBuffer && canvasRef.current) {
      let isCancelled = false;
      setIsProcessing(true);
      setErrorMsg(null);

      renderPdfPageToCanvas(pdfBuffer, currentPage, canvasRef.current)
        .then((info) => {
          if (!isCancelled) {
            setTotalPages(info.numPages);
            setIsProcessing(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setErrorMsg('Lỗi đọc trang PDF: ' + (err.message || 'Không thể render PDF'));
            setIsProcessing(false);
          }
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [sourceType, pdfBuffer, currentPage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          setPdfBuffer(reader.result);
          setSourceType('pdf');
          setCurrentPage(1);
        }
      };
      reader.onerror = () => setErrorMsg('Không thể đọc file PDF.');
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            canvasRef.current.width = img.naturalWidth;
            canvasRef.current.height = img.naturalHeight;
            const ctx = canvasRef.current.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            setSourceType('image');
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      setErrorMsg('Vui lòng chọn file ảnh (PNG, JPG, WEBP) hoặc file PDF.');
    }
  };

  // Drag handlers for the crop rectangle overlay
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handle: 'move' | 'nw' | 'ne' | 'se' | 'sw'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    isDraggingRef.current = handle;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialArea: { ...cropArea },
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragStartRef.current.x) / rect.width;
    const dy = (e.clientY - dragStartRef.current.y) / rect.height;
    const initial = dragStartRef.current.initialArea;

    let newX = initial.x;
    let newY = initial.y;
    let newW = initial.width;
    let newH = initial.height;

    const handle = isDraggingRef.current;

    if (handle === 'move') {
      newX = clamp(initial.x + dx, 0, 1 - initial.width);
      newY = clamp(initial.y + dy, 0, 1 - initial.height);
    } else if (handle === 'se') {
      newW = clamp(initial.width + dx, 0.05, 1 - initial.x);
      newH = clamp(initial.height + dy, 0.05, 1 - initial.y);
    } else if (handle === 'nw') {
      const maxDx = initial.width - 0.05;
      const maxDy = initial.height - 0.05;
      const actualDx = Math.min(maxDx, Math.max(-initial.x, dx));
      const actualDy = Math.min(maxDy, Math.max(-initial.y, dy));
      newX = initial.x + actualDx;
      newY = initial.y + actualDy;
      newW = initial.width - actualDx;
      newH = initial.height - actualDy;
    } else if (handle === 'ne') {
      const maxDy = initial.height - 0.05;
      const actualDy = Math.min(maxDy, Math.max(-initial.y, dy));
      newY = initial.y + actualDy;
      newW = clamp(initial.width + dx, 0.05, 1 - initial.x);
      newH = initial.height - actualDy;
    } else if (handle === 'sw') {
      const maxDx = initial.width - 0.05;
      const actualDx = Math.min(maxDx, Math.max(-initial.x, dx));
      newX = initial.x + actualDx;
      newW = initial.width - actualDx;
      newH = clamp(initial.height + dy, 0.05, 1 - initial.y);
    }

    setCropArea({
      x: clamp(newX, 0, 1),
      y: clamp(newY, 0, 1),
      width: clamp(newW, 0.05, 1),
      height: clamp(newH, 0.05, 1),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = null;
  };

  // Execute crop and save
  const handleApplyCrop = async () => {
    if (!canvasRef.current && !previewDataUrl) {
      setErrorMsg('Chưa có ảnh hoặc trang PDF để cắt.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const bbox = cropAreaToBbox(cropArea);
      let finalUrl = previewDataUrl;

      if (canvasRef.current && sourceType !== 'none') {
        const cropRes = await cropCanvasRegion(canvasRef.current, bbox);
        finalUrl = await saveFigure(cropRes.blob, { userId });
      }

      if (!finalUrl) {
        throw new Error('Không tạo được hình ảnh.');
      }

      onSave({
        url: finalUrl,
        caption: caption.trim() || undefined,
        page: sourceType === 'pdf' ? currentPage : undefined,
        bbox: sourceType !== 'none' ? bbox : initialFigure?.bbox,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg('Lỗi khi cắt hình: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cắt & Gắn hình ảnh minh họa cho câu hỏi"
      size="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Upload bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-bg p-3.5 rounded-2xl border-2 border-brand-border">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-blue text-white font-bold text-xs shadow-sm hover:opacity-90 active:scale-95 transition-all">
                <UploadCloud className="w-4 h-4" />
                Chọn file PDF hoặc Ảnh...
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <span className="text-xs text-surface-secondary font-medium">
              {sourceType === 'pdf'
                ? 'Đang xem file PDF'
                : sourceType === 'image'
                ? 'Đang xem file Ảnh'
                : 'Hỗ trợ PDF đề thi hoặc ảnh chụp bài tập'}
            </span>
          </div>

          {sourceType === 'pdf' && (
            <div className="flex items-center gap-2 bg-brand-surface px-3 py-1 rounded-xl border border-brand-border">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1 || isProcessing}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-surface-primary">
                Trang {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages || isProcessing}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cropping Workspace */}
        <div className="relative w-full min-h-[320px] max-h-[500px] overflow-auto bg-black/5 dark:bg-black/30 rounded-2xl border-2 border-dashed border-brand-border flex items-center justify-center p-2 custom-scrollbar">
          {sourceType === 'none' && !previewDataUrl && (
            <div className="flex flex-col items-center gap-2 text-surface-secondary py-12">
              <ImageIcon className="w-12 h-12 stroke-[1.5] text-brand-blue/50" />
              <p className="text-xs font-bold">Chưa tải tài liệu nào</p>
              <p className="text-[11px] text-surface-secondary/70">
                Hãy tải file PDF hoặc kéo thả ảnh minh họa câu hỏi vào đây
              </p>
            </div>
          )}

          {/* Canvas container with Crop Overlay */}
          <div
            ref={containerRef}
            className={`relative max-w-full inline-block ${
              sourceType === 'none' && previewDataUrl ? 'block' : ''
            }`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              className={`max-w-full h-auto block rounded-lg shadow-sm ${
                sourceType === 'none' ? 'hidden' : ''
              }`}
            />

            {sourceType === 'none' && previewDataUrl && (
              <div className="flex flex-col items-center gap-2 p-4">
                <img
                  src={previewDataUrl}
                  alt="Ảnh hiện tại"
                  className="max-h-[320px] rounded-xl border border-brand-border object-contain shadow-md"
                />
                <span className="text-xs font-bold text-surface-secondary">
                  Hình ảnh câu hỏi hiện tại
                </span>
              </div>
            )}

            {/* Interactive Crop Box Overlay */}
            {sourceType !== 'none' && (
              <div
                style={{
                  left: `${cropArea.x * 100}%`,
                  top: `${cropArea.y * 100}%`,
                  width: `${cropArea.width * 100}%`,
                  height: `${cropArea.height * 100}%`,
                }}
                className="absolute border-2 border-brand-blue bg-brand-blue/20 cursor-move rounded select-none box-border shadow-lg"
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                {/* 4 Corner Resize Handles */}
                <div
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-brand-blue border-2 border-white rounded-full cursor-nwse-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                />
                <div
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-brand-blue border-2 border-white rounded-full cursor-nesw-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                />
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-brand-blue border-2 border-white rounded-full cursor-nwse-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-brand-blue border-2 border-white rounded-full cursor-nesw-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                />

                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-brand-navy/80 text-[10px] text-white font-mono font-bold pointer-events-none">
                  {Math.round(cropArea.width * 100)}% x {Math.round(cropArea.height * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caption & Controls */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-surface-primary">
            Chú thích hình ảnh (tùy chọn):
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ví dụ: Hình 1: Đồ thị hàm số y = f(x)..."
            className="w-full px-3.5 py-2 rounded-xl bg-brand-bg text-surface-primary text-xs font-medium border-2 border-brand-border outline-none focus:border-brand-blue transition-colors"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-brand-border">
          <div>
            {(initialFigure?.url || previewDataUrl) && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                Gỡ bỏ hình ảnh
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isProcessing}
              disabled={sourceType === 'none' && !previewDataUrl}
              leftIcon={<CropIcon className="w-4 h-4" />}
              onClick={handleApplyCrop}
            >
              Áp dụng hình ảnh
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
