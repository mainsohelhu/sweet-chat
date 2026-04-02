import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Cropper from 'react-easy-crop';
import toast from 'react-hot-toast';

export default function AvatarCropper({ image, onCancel, onCropComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropCompleteEvent = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (error) => reject(error));
      img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg');
    });
  };

  const handleSave = async () => {
    try {
      setProcessing(true);
      const croppedFile = await getCroppedImg(image, croppedAreaPixels);
      if (croppedFile) {
        onCropComplete(croppedFile);
      } else {
        throw new Error('Failed to crop');
      }
    } catch (e) {
      toast.error('Failed to crop image');
      setProcessing(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="flex items-center justify-between p-4 flex-shrink-0 border-b border-white/10 z-10">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
          Crop Profile Image
        </h2>
        <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="relative flex-1 w-full bg-black">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteEvent}
          onZoomChange={setZoom}
        />
      </div>

      <div className="p-6 bg-[var(--surface)] border-t border-[var(--border)] z-10 glass">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-4">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="flex-1 accent-brand-500"
            />
          </div>
          
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-[var(--surface-2)] text-[var(--text)] font-semibold hover:bg-[var(--surface-3)] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={processing} className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2">
              {processing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {processing ? 'Applying...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
