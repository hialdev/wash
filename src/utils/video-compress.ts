export async function compressVideo(
   file: File,
   onProgress?: (progress: number) => void,
   maxSizeBytes = 10 * 1024 * 1024
): Promise<File> {
   if (file.size <= maxSizeBytes) {
      return file;
   }

   return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      // Disable CORS issues when playing local blobs
      video.crossOrigin = 'anonymous';

      if (onProgress) {
         video.ontimeupdate = () => {
            if (video.duration) {
               const progress = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
               onProgress(progress);
            }
         };
      }

      video.onloadedmetadata = () => {
         // Create stream from video
         const stream =
            (video as any).captureStream ?
               (video as any).captureStream() :
               (video as any).mozCaptureStream ?
                  (video as any).mozCaptureStream() :
                  null;

         if (!stream) {
            URL.revokeObjectURL(video.src);
            reject(new Error('Browser does not support capturing streams from video elements'));
            return;
         }

         // Target slightly under 10MB to be safe (~8MB)
         const targetSizeBytes = 8 * 1024 * 1024;
         const duration = video.duration || 10;
         const targetBitrate = Math.max(
            500000,
            Math.min(2500000, Math.floor((targetSizeBytes * 8) / duration))
         );

         let mimeType = 'video/webm;codecs=vp9';
         if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm;codecs=vp8';
         }
         if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
         }
         if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
         }

         try {
            const recorder = new MediaRecorder(stream, {
               mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
               videoBitsPerSecond: targetBitrate,
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
               if (e.data && e.data.size > 0) {
                  chunks.push(e.data);
               }
            };

            recorder.onstop = () => {
               const actualMime = mimeType || 'video/webm';
               const compressedBlob = new Blob(chunks, { type: actualMime });
               const isMp4 = actualMime.includes('mp4');
               const ext = isMp4 ? '.mp4' : '.webm';
               const newName = file.name.replace(/\.[^/.]+$/, '') + '_compressed' + ext;

               const compressedFile = new File([compressedBlob], newName, {
                  type: actualMime,
               });

               URL.revokeObjectURL(video.src);
               resolve(compressedFile);
            };

            recorder.start();
            video.play().catch((err) => {
               URL.revokeObjectURL(video.src);
               reject(err);
            });

            video.onended = () => {
               recorder.stop();
               stream.getTracks().forEach((track: any) => track.stop());
            };
         } catch (err) {
            URL.revokeObjectURL(video.src);
            reject(err);
         }
      };

      video.onerror = (e) => {
         URL.revokeObjectURL(video.src);
         reject(new Error('Failed to load video file for compression'));
      };
   });
}
