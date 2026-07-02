import React, { useEffect, useRef, useState } from "react";

const DEFAULT_OUTPUT_WIDTH = 1200;
const DEFAULT_OUTPUT_HEIGHT = 900;
const DEFAULT_ASPECT_RATIO_OPTIONS = [
  { label: "Wide", aspectRatio: "16 / 10", outputWidth: 1600, outputHeight: 1000 },
  { label: "Landscape", aspectRatio: "4 / 3", outputWidth: 1200, outputHeight: 900 },
  { label: "Square", aspectRatio: "1 / 1", outputWidth: 1200, outputHeight: 1200 },
  { label: "Portrait", aspectRatio: "4 / 5", outputWidth: 1200, outputHeight: 1500 },
  { label: "Mobile", aspectRatio: "9 / 16", outputWidth: 1080, outputHeight: 1920 },
  { label: "Original", aspectRatio: "original" },
];

function getRatioValue(aspectRatio) {
  if (typeof aspectRatio === "number" && Number.isFinite(aspectRatio) && aspectRatio > 0) {
    return aspectRatio;
  }

  const match = String(aspectRatio || "").match(/^\s*(\d+(?:\.\d+)?)\s*(?:\/|:)\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) return DEFAULT_OUTPUT_WIDTH / DEFAULT_OUTPUT_HEIGHT;

  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? width / height : DEFAULT_OUTPUT_WIDTH / DEFAULT_OUTPUT_HEIGHT;
}

function getOutputSizeForRatio(aspectRatio, fallbackWidth = DEFAULT_OUTPUT_WIDTH, fallbackHeight = DEFAULT_OUTPUT_HEIGHT) {
  const ratio = getRatioValue(aspectRatio);
  const longSide = Math.max(fallbackWidth, fallbackHeight, 1200);

  if (ratio >= 1) {
    return {
      width: longSide,
      height: Math.max(1, Math.round(longSide / ratio)),
    };
  }

  return {
    width: Math.max(1, Math.round(longSide * ratio)),
    height: longSide,
  };
}

function clampOffset(offset, imageSize, viewportSize, zoom) {
  if (!imageSize.width || !viewportSize.width) return { x: 0, y: 0 };
  const coverScale = Math.max(viewportSize.width / imageSize.width, viewportSize.height / imageSize.height);
  const maxX = Math.max(0, (imageSize.width * coverScale * zoom - viewportSize.width) / 2);
  const maxY = Math.max(0, (imageSize.height * coverScale * zoom - viewportSize.height) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

export default function ImageCropModal({
  file,
  animalName,
  title,
  description = "Drag to reposition. Pinch or scroll to zoom.",
  aspectRatio = "4 / 3",
  outputWidth = DEFAULT_OUTPUT_WIDTH,
  outputHeight = DEFAULT_OUTPUT_HEIGHT,
  outputType = "image/jpeg",
  outputQuality = 0.9,
  outputFileSuffix = "cropped",
  aspectRatioOptions = DEFAULT_ASPECT_RATIO_OPTIONS,
  confirmLabel = "Use photo",
  onCancel,
  onConfirm,
}) {
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [cropError, setCropError] = useState("");
  const [cropConfig, setCropConfig] = useState({
    aspectRatio,
    outputWidth,
    outputHeight,
  });
  const [customRatio, setCustomRatio] = useState({ width: "9", height: "16" });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const updateSize = () => {
      const rect = viewport.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setOffset((current) => clampOffset(current, imageSize, viewportSize, zoom));
  }, [imageSize, viewportSize, zoom]);

  useEffect(() => {
    setCropConfig({ aspectRatio, outputWidth, outputHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [aspectRatio, outputHeight, outputWidth, file]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onCancel]);

  function resetCrop() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function getOriginalCropConfig() {
    const ratioText = imageSize.width && imageSize.height
      ? `${imageSize.width} / ${imageSize.height}`
      : aspectRatio;
    const size = getOutputSizeForRatio(ratioText, outputWidth, outputHeight);

    return {
      aspectRatio: ratioText,
      outputWidth: size.width,
      outputHeight: size.height,
    };
  }

  function selectAspectRatio(option) {
    const generatedSize = getOutputSizeForRatio(option.aspectRatio, outputWidth, outputHeight);
    const nextConfig = option.aspectRatio === "original"
      ? getOriginalCropConfig()
      : {
          aspectRatio: option.aspectRatio,
          outputWidth: option.outputWidth || generatedSize.width,
          outputHeight: option.outputHeight || generatedSize.height,
        };

    setCropConfig(nextConfig);
    resetCrop();
  }

  function applyCustomAspectRatio() {
    const ratioWidth = Number(customRatio.width);
    const ratioHeight = Number(customRatio.height);
    if (!ratioWidth || !ratioHeight || ratioWidth <= 0 || ratioHeight <= 0) {
      setCropError("Enter a valid custom crop ratio.");
      return;
    }

    const customAspectRatio = `${ratioWidth} / ${ratioHeight}`;
    const size = getOutputSizeForRatio(customAspectRatio, outputWidth, outputHeight);
    setCropError("");
    setCropConfig({
      aspectRatio: customAspectRatio,
      outputWidth: size.width,
      outputHeight: size.height,
    });
    resetCrop();
  }

  function updateZoom(nextZoom, focalPoint = null) {
    const clampedZoom = Math.max(1, Math.min(3, nextZoom));
    setOffset((current) => {
      if (!focalPoint || !zoom) return clampOffset(current, imageSize, viewportSize, clampedZoom);
      const ratio = clampedZoom / zoom;
      const centerX = viewportSize.width / 2;
      const centerY = viewportSize.height / 2;
      return clampOffset({
        x: focalPoint.x - centerX - (focalPoint.x - centerX - current.x) * ratio,
        y: focalPoint.y - centerY - (focalPoint.y - centerY - current.y) * ratio,
      }, imageSize, viewportSize, clampedZoom);
    });
    setZoom(clampedZoom);
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 1) {
      gestureRef.current = { type: "drag", start: pointers[0], offset };
    } else if (pointers.length === 2) {
      gestureRef.current = {
        type: "pinch",
        distance: Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y),
        zoom,
      };
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...pointersRef.current.values()];
    if (pointers.length === 1 && gestureRef.current?.type === "drag") {
      setOffset(clampOffset({
        x: gestureRef.current.offset.x + pointers[0].x - gestureRef.current.start.x,
        y: gestureRef.current.offset.y + pointers[0].y - gestureRef.current.start.y,
      }, imageSize, viewportSize, zoom));
    } else if (pointers.length === 2 && gestureRef.current?.type === "pinch") {
      const distance = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
      updateZoom(gestureRef.current.zoom * (distance / gestureRef.current.distance));
    }
  }

  function handlePointerEnd(event) {
    pointersRef.current.delete(event.pointerId);
    const pointers = [...pointersRef.current.values()];
    gestureRef.current = pointers.length === 1 ? { type: "drag", start: pointers[0], offset } : null;
  }

  function handleWheel(event) {
    event.preventDefault();
    const rect = viewportRef.current.getBoundingClientRect();
    updateZoom(zoom + (event.deltaY < 0 ? 0.12 : -0.12), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  async function createCroppedFile() {
    if (!imageRef.current || !viewportSize.width) return;
    setIsSaving(true);
    setCropError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = cropConfig.outputWidth;
      canvas.height = cropConfig.outputHeight;
      const context = canvas.getContext("2d");
      const coverScale = Math.max(viewportSize.width / imageSize.width, viewportSize.height / imageSize.height);
      const displayedWidth = imageSize.width * coverScale * zoom;
      const displayedHeight = imageSize.height * coverScale * zoom;
      const scaleX = cropConfig.outputWidth / viewportSize.width;
      const scaleY = cropConfig.outputHeight / viewportSize.height;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (outputType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(
        imageRef.current,
        ((viewportSize.width - displayedWidth) / 2 + offset.x) * scaleX,
        ((viewportSize.height - displayedHeight) / 2 + offset.y) * scaleY,
        displayedWidth * scaleX,
        displayedHeight * scaleY
      );

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, outputQuality));
      if (!blob) throw new Error("Could not prepare the cropped photo.");
      const baseName = file.name.replace(/\.[^/.]+$/, "") || "photo";
      const extension = outputType === "image/png" ? "png" : "jpg";
      await onConfirm(new File([blob], `${baseName}-${outputFileSuffix}.${extension}`, { type: outputType }));
    } catch (error) {
      setCropError(error.message || "Could not prepare this photo. Please try another image.");
    } finally {
      setIsSaving(false);
    }
  }

  const coverScale = imageSize.width && viewportSize.width
    ? Math.max(viewportSize.width / imageSize.width, viewportSize.height / imageSize.height)
    : 1;
  const displayWidth = imageSize.width * coverScale * zoom;
  const displayHeight = imageSize.height * coverScale * zoom;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="crop-photo-title">
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-gray-700 bg-gray-900 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-3xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-700 px-4 py-4 sm:px-6">
          <div>
            <h2 id="crop-photo-title" className="text-lg font-bold text-white sm:text-xl">{title || `Adjust ${animalName || "animal"} photo`}</h2>
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          </div>
          <button type="button" onClick={onCancel} disabled={isSaving} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-800 text-2xl text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-50" aria-label="Close photo editor">×</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            ref={viewportRef}
            className="relative mx-auto w-full max-w-2xl cursor-move touch-none overflow-hidden rounded-2xl bg-black shadow-inner"
            style={{ aspectRatio: cropConfig.aspectRatio }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={handleWheel}
          >
            {sourceUrl && (
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Crop preview"
                draggable="false"
                onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/85 shadow-[inset_0_0_0_999px_rgba(0,0,0,0.08)]" />
            <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/25" />
            <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/25" />
            <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/25" />
            <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/25" />
          </div>

          <div className="mx-auto mt-5 flex max-w-2xl items-center gap-3">
            <span className="text-sm font-medium text-gray-400" aria-hidden="true">−</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} className="h-11 min-w-0 flex-1 cursor-pointer accent-blue-500" aria-label="Photo zoom" />
            <span className="text-sm font-medium text-gray-400" aria-hidden="true">+</span>
            <button type="button" onClick={resetCrop} className="min-h-11 rounded-xl border border-gray-600 px-4 text-sm font-semibold text-gray-200 transition hover:bg-gray-800">Reset</button>
          </div>
          <div className="mx-auto mt-4 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Crop shape</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {aspectRatioOptions.map((option) => {
                const optionRatio = option.aspectRatio === "original" ? getOriginalCropConfig().aspectRatio : option.aspectRatio;
                const isSelected = cropConfig.aspectRatio === optionRatio;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => selectAspectRatio(option)}
                    disabled={option.aspectRatio === "original" && !imageSize.width}
                    className={`min-h-10 rounded-lg border px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? "border-blue-300 bg-blue-500/20 text-blue-100"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <input
                type="number"
                min="1"
                step="0.1"
                value={customRatio.width}
                onChange={(event) => setCustomRatio((current) => ({ ...current, width: event.target.value }))}
                className="min-h-10 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white outline-none focus:border-blue-300"
                aria-label="Custom crop ratio width"
              />
              <span className="text-sm font-semibold text-gray-500">:</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={customRatio.height}
                onChange={(event) => setCustomRatio((current) => ({ ...current, height: event.target.value }))}
                className="min-h-10 rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white outline-none focus:border-blue-300"
                aria-label="Custom crop ratio height"
              />
              <button
                type="button"
                onClick={applyCustomAspectRatio}
                className="min-h-10 rounded-lg border border-gray-700 bg-gray-800 px-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white"
              >
                Apply
              </button>
            </div>
          </div>
          {cropError && (
            <p className="mx-auto mt-3 max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
              {cropError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-700 bg-gray-900 px-4 py-4 sm:flex sm:justify-end sm:px-6">
          <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-12 rounded-xl border border-gray-600 px-5 font-semibold text-gray-200 transition hover:bg-gray-800 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={createCroppedFile} disabled={isSaving || !imageSize.width} className="min-h-12 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
