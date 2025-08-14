export interface MediaCapabilities {
  hasAudioInput: boolean;
  audioInputDevices: number;
  detectionError?: string;
  detectedAt: Date;
}

/**
 * Detects available media capabilities, specifically audio input.
 * Treats permission denied the same as no microphone detected.
 */
export async function detectMediaCapabilities(): Promise<MediaCapabilities> {
  const result: MediaCapabilities = {
    hasAudioInput: false,
    audioInputDevices: 0,
    detectedAt: new Date()
  };

  try {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      result.detectionError = 'getUserMedia not supported';
      return result;
    }

    // Enumerate audio input devices first
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
      result.audioInputDevices = audioInputDevices.length;

      if (audioInputDevices.length === 0) {
        result.detectionError = 'No audio input devices found';
        return result;
      }
    } catch (enumerateError) {
      console.warn('Could not enumerate devices:', enumerateError);
      // Continue with getUserMedia test anyway
    }

    // Test actual microphone access
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      // Check if audio track is actually available
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        result.hasAudioInput = true;
        console.log('Microphone detected successfully');
      } else {
        result.detectionError = 'No audio tracks in stream';
      }
    } catch (getUserMediaError: unknown) {
      // Treat permission denied or any other error as "no microphone"
      // This includes: NotAllowedError, NotFoundError, NotReadableError, etc.
      const errorName = getUserMediaError instanceof Error ? getUserMediaError.name : 'Unknown error';
      result.detectionError = errorName;
      console.log('Media access failed or denied:', errorName);
    } finally {
      // Always clean up the stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }

  } catch (error) {
    result.detectionError = 'Unexpected error during detection';
    console.error('Media detection error:', error);
  }

  return result;
}

/**
 * Quick check if microphone is likely available without requesting permissions.
 * Useful for showing UI hints before actual detection.
 */
export async function checkMicrophoneAvailable(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
    return audioInputDevices.length > 0;
  } catch {
    return false;
  }
}
