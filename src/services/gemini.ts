import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `
You are Lonix, an expert financial assistant specializing in Indian bank loans and RBI policies.
Your goal is to provide accurate, helpful, and clear information about home loans, personal loans, car loans, educational loans, vehicle loans, gold loans, and the impact of RBI repo rates.

Key Guidelines:
1. Always mention that interest rates are subject to change and vary by bank.
2. Provide a disclaimer: "This is for informational purposes only. Please consult with your bank for final rates and terms."
3. If asked about current rates, mention that you can provide the latest available data from major banks like SBI, HDFC, ICICI, and Axis.
4. If asked to calculate EMI, explain that you have a built-in calculator for precise numbers.
5. Use a professional yet approachable tone.
6. Support both English and Hindi. If the user asks in Hindi, respond in Hindi.
7. Explain complex terms like "Repo Rate", "MCLR", "Fixed vs Floating" in simple language.
8. Align with the latest RBI guidelines (e.g., repo rate currently at 6.50% as of early 2024).

When the user asks for:
- "Home loan interest": Provide general ranges and mention major banks.
- "EMI for X amount": Offer to calculate it or provide a rough estimate if interest rate is provided.
- "Repo rate": Explain it's the rate at which RBI lends to banks and how it affects loan EMIs.
`;

export async function chatWithGemini(message: string, history: { role: 'user' | 'model', parts: [{ text: string }] }[] = []) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-flash-lite-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
      },
      history: history
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I'm having trouble connecting to my financial brain. Please try again in a moment.";
  }
}

export async function speakText(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // The Gemini TTS model returns raw PCM data (16-bit, mono, 24kHz).
      // We need to wrap it in a WAV header so the browser can play it.
      const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      const wavData = createWavHeader(pcmData);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

function createWavHeader(pcmData: Uint8Array): Uint8Array {
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, chunkSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const wav = new Uint8Array(44 + dataSize);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcmData, 44);

  return wav;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
