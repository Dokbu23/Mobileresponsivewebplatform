import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle, Loader, Pause, Play, XCircle } from 'lucide-react';
import {
  MediaProcessingState,
  formatBytes,
  formatDuration,
  formatBitrate,
  createProcessingStatus,
} from '../lib/compressionMetrics';

interface MediaUploadProgressProps {
  state: MediaProcessingState;
  originalSize: number;
  compressedSize: number;
  uploadedBytes: number;
  totalUploadSize: number;
  startTime: number;
  isCompressing: boolean;
  isPaused: boolean;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  showDetails?: boolean;
}

export function MediaUploadProgress({
  state,
  originalSize,
  compressedSize,
  uploadedBytes,
  totalUploadSize,
  startTime,
  isCompressing,
  isPaused,
  onCancel,
  onPause,
  onResume,
  showDetails = true,
}: MediaUploadProgressProps): JSX.Element {
  const elapsedMs = Date.now() - startTime;
  const uploadProgress = totalUploadSize > 0 ? (uploadedBytes / totalUploadSize) * 100 : 0;
  const uploadSpeedBps = elapsedMs > 0 ? (uploadedBytes / elapsedMs) * 1000 : 0;
  const timeRemainingMs = uploadSpeedBps > 0 ? (totalUploadSize - uploadedBytes) / uploadSpeedBps : 0;
  
  const compressionRatio = originalSize > 0 ? (compressedSize / originalSize) * 100 : 0;
  const savedBytes = originalSize - compressedSize;

  const statusColor = useMemo(() => {
    if (state.phase === 'complete') return 'text-green-600';
    if (state.error) return 'text-red-600';
    if (isPaused) return 'text-yellow-600';
    return 'text-blue-600';
  }, [state.phase, state.error, isPaused]);

  const progressBarColor = useMemo(() => {
    if (state.phase === 'complete') return 'bg-green-500';
    if (state.error) return 'bg-red-500';
    if (state.phase === 'compressing') return 'bg-blue-500';
    return 'bg-purple-500';
  }, [state.phase, state.error]);

  const statusIcon = useMemo(() => {
    if (state.phase === 'complete' && !state.error) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (state.error) {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    if (isCompressing || state.phase === 'uploading') {
      return <Loader className="w-5 h-5 animate-spin text-blue-600" />;
    }
    return <XCircle className="w-5 h-5 text-gray-400" />;
  }, [state.phase, state.error, isCompressing]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      {/* Header with status and controls */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          {statusIcon}
          <div className="flex-1">
            <div className={`text-sm font-medium ${statusColor}`}>
              {createProcessingStatus(state)}
            </div>
            {state.error && (
              <div className="text-xs text-red-600 mt-1">{state.error}</div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {state.phase !== 'complete' && !state.error && (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Resume"
                >
                  <Play className="w-4 h-4 text-blue-600" />
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Pause"
                >
                  <Pause className="w-4 h-4 text-yellow-600" />
                </button>
              )}
              <button
                onClick={onCancel}
                className="p-2 hover:bg-red-100 rounded-lg transition"
                title="Cancel"
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar - overall */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-600 font-medium">Overall Progress</span>
          <span className="text-gray-700 font-semibold">{state.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full ${progressBarColor} transition-all duration-300`}
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>

      {/* Detailed metrics - only when processing/uploading */}
      {showDetails && (state.phase === 'compressing' || state.phase === 'uploading') && (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          {/* Left column */}
          <div className="space-y-2 text-xs">
            {state.phase === 'compressing' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Size:</span>
                  <span className="font-medium text-gray-900">{formatBytes(originalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compressed Size:</span>
                  <span className="font-medium text-gray-900">{formatBytes(compressedSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Compression:</span>
                  <span className="font-medium text-green-700">{compressionRatio.toFixed(1)}%</span>
                </div>
              </>
            )}
            {state.phase === 'uploading' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Upload Speed:</span>
                  <span className="font-medium text-gray-900">{formatBitrate(uploadSpeedBps)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uploaded:</span>
                  <span className="font-medium text-gray-900">
                    {formatBytes(uploadedBytes)} / {formatBytes(totalUploadSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Remaining:</span>
                  <span className="font-medium text-gray-900">
                    {formatDuration(timeRemainingMs)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-2 text-xs">
            {state.phase === 'compressing' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Saved:</span>
                  <span className="font-medium text-blue-700">{formatBytes(savedBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reduction:</span>
                  <span className="font-medium text-green-700">
                    {((1 - compressionRatio / 100) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phase:</span>
                  <span className="font-medium text-blue-600">Compressing…</span>
                </div>
              </>
            )}
            {state.phase === 'uploading' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Elapsed:</span>
                  <span className="font-medium text-gray-900">{formatDuration(elapsedMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium text-purple-700">{uploadProgress.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phase:</span>
                  <span className="font-medium text-purple-600">Uploading…</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Completion message */}
      {state.phase === 'complete' && !state.error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
          <div className="font-medium text-green-900">✅ Upload Complete!</div>
          <div className="text-green-700 mt-1">
            Compressed {formatBytes(savedBytes)} ({((1 - compressionRatio / 100) * 100).toFixed(1)}% reduction)
          </div>
          <div className="text-xs text-green-600 mt-1">
            Compression time: {formatDuration(elapsedMs)}
          </div>
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <div className="font-medium text-red-900">❌ Upload Failed</div>
          <div className="text-red-700 mt-1">{state.error}</div>
        </div>
      )}
    </div>
  );
}

export default MediaUploadProgress;
