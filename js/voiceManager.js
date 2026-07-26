/**
 * VoiceManager - Narrador de Voz Sintetizada IA (Web Speech API)
 * Módulo de NaviCore Autonomous Navigation Software
 */

export class VoiceManager {
    constructor() {
        this.enabled = true;
        this.synth = window.speechSynthesis || null;
        this.voice = null;
        this.initVoice();
    }

    initVoice() {
        if (!this.synth) return;
        const setVoice = () => {
            const voices = this.synth.getVoices();
            // Buscar voz en español
            this.voice = voices.find(v => v.lang.includes('es')) || voices[0];
        };
        setVoice();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = setVoice;
        }
    }

    speak(text) {
        if (!this.enabled || !this.synth) return;
        
        // Limpiar HTML tags si existen
        const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");

        this.synth.cancel(); // Detener locución previa
        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (this.voice) utterance.voice = this.voice;
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        this.synth.speak(utterance);
    }
}
