import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  onAudioBlob?: (blob: Blob) => void; // For sending audio directly (DM)
  language: string;
  mode?: 'transcribe' | 'audio'; // transcribe = convert to text, audio = send as audio file
  disabled?: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function VoiceRecorder({ 
  onTranscription, 
  onAudioBlob,
  language, 
  mode = 'transcribe',
  disabled = false,
  showToast 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    // If already recording, stop
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    // Request microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio recorded, size:', audioBlob.size);
        
        if (audioBlob.size < 1000) {
          showToast(language === 'tr' ? 'Ses kaydı çok kısa' : 'Recording too short', 'error');
          return;
        }

        // If mode is 'audio', just return the blob for direct sending
        if (mode === 'audio' && onAudioBlob) {
          onAudioBlob(audioBlob);
          showToast(language === 'tr' ? 'Ses kaydedildi' : 'Audio recorded', 'success');
          return;
        }

        // Otherwise transcribe
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const response = await fetch('https://soewlqmskqmpycaevhoc.supabase.co/functions/v1/whisper-transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          
          if (data.text) {
            onTranscription(data.text);
            showToast(language === 'tr' ? 'Ses metne çevrildi' : 'Voice transcribed', 'success');
          } else {
            showToast(language === 'tr' ? 'Ses anlaşılamadı' : 'Could not understand audio', 'error');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          showToast(language === 'tr' ? 'Ses çevirme hatası' : 'Transcription error', 'error');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      showToast(
        language === 'tr' ? 'Kayıt başladı... Bitince tekrar tıklayın' : 'Recording... Click again when done', 
        'info'
      );
      
    } catch (error) {
      console.error('Microphone access error:', error);
      showToast(language === 'tr' ? 'Mikrofon erişimi reddedildi' : 'Microphone access denied', 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={disabled || isTranscribing}
      className={`p-2 rounded-lg transition-all duration-300 ${
        isTranscribing
          ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400 animate-pulse'
          : isRecording 
          ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse' 
          : 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/30'
      } ${disabled || isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={
        isTranscribing 
          ? (language === 'tr' ? 'Çevriliyor...' : 'Transcribing...') 
          : isRecording 
          ? (language === 'tr' ? 'Kaydı Durdur' : 'Stop Recording') 
          : (language === 'tr' ? 'Sesli Giriş' : 'Voice Input')
      }
    >
      {isTranscribing ? (
        <Loader2 size={18} className="animate-spin" />
      ) : isRecording ? (
        <MicOff size={18} />
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
}
