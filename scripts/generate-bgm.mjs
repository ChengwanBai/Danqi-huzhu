import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, 'assets/audio/changban-drum-loop.wav');
const sampleRate = 22050;
const bpm = 92;
const beat = 60 / bpm;
const bars = 24;
const beatsPerBar = 4;
const duration = bars * beatsPerBar * beat;
const length = Math.floor(duration * sampleRate);
const data = new Float32Array(length);

const note = midi => 440 * 2 ** ((midi - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const idx = t => Math.floor(t * sampleRate);

function addPluck(start, midi, dur, gain = 0.18, pan = 0) {
  const f = note(midi);
  const n0 = idx(start), n1 = Math.min(length, idx(start + dur));
  for (let i = n0; i < n1; i++) {
    const t = i / sampleRate - start;
    const env = Math.exp(-t * 4.6) * Math.min(1, t / 0.012);
    const bend = 1 - 0.018 * Math.exp(-t * 12);
    const s =
      Math.sin(2 * Math.PI * f * bend * t) * 0.66 +
      Math.sin(2 * Math.PI * f * 2.01 * t) * 0.2 +
      Math.sin(2 * Math.PI * f * 3.02 * t) * 0.09;
    data[i] += s * env * gain * (1 - Math.abs(pan) * 0.12);
  }
}

function addDrone(start, dur, midi, gain = 0.07) {
  const f = note(midi);
  const n0 = idx(start), n1 = Math.min(length, idx(start + dur));
  for (let i = n0; i < n1; i++) {
    const t = i / sampleRate - start;
    const fade = Math.min(1, t / 1.8, (dur - t) / 1.8);
    const pulse = 0.82 + 0.18 * Math.sin(2 * Math.PI * 0.19 * t);
    data[i] += (
      Math.sin(2 * Math.PI * f * t) * 0.7 +
      Math.sin(2 * Math.PI * f * 0.5 * t) * 0.3
    ) * gain * fade * pulse;
  }
}

function addDrum(start, gain = 0.42, low = true) {
  const dur = low ? 0.62 : 0.24;
  const n0 = idx(start), n1 = Math.min(length, idx(start + dur));
  for (let i = n0; i < n1; i++) {
    const t = i / sampleRate - start;
    const f = low ? 58 + 42 * Math.exp(-t * 12) : 120 + 60 * Math.exp(-t * 18);
    const env = Math.exp(-t * (low ? 7 : 15));
    const body = Math.sin(2 * Math.PI * f * t);
    const click = Math.sin(2 * Math.PI * 380 * t) * Math.exp(-t * 38);
    data[i] += (body * 0.9 + click * 0.22) * env * gain;
  }
}

function addGong(start, gain = 0.16) {
  const dur = 2.4;
  const n0 = idx(start), n1 = Math.min(length, idx(start + dur));
  for (let i = n0; i < n1; i++) {
    const t = i / sampleRate - start;
    const env = Math.exp(-t * 1.65) * Math.min(1, t / 0.02);
    const s =
      Math.sin(2 * Math.PI * 109 * t) * 0.55 +
      Math.sin(2 * Math.PI * 164 * t + 0.7) * 0.26 +
      Math.sin(2 * Math.PI * 247 * t + 1.2) * 0.12;
    data[i] += s * env * gain;
  }
}

const phraseA = [62, 65, 67, 69, 72, 69, 67, 65, 62, 57, 60, 62, 65, 67, 65, 62];
const phraseB = [69, 72, 74, 77, 74, 72, 69, 67, 65, 67, 69, 72, 69, 67, 65, 62];
const phraseC = [57, 62, 65, 67, 69, 67, 65, 62, 60, 62, 65, 69, 72, 69, 67, 65];

addDrone(0, duration, 38, 0.055);
addDrone(0, duration, 45, 0.035);

for (let bar = 0; bar < bars; bar++) {
  const barStart = bar * beatsPerBar * beat;
  addDrum(barStart, bar % 8 === 0 ? 0.54 : 0.42, true);
  addDrum(barStart + beat * 2, 0.34, true);
  addDrum(barStart + beat * 1.5, 0.18, false);
  addDrum(barStart + beat * 3.5, 0.22, false);
  if (bar % 8 === 0) addGong(barStart, 0.18);
  if (bar % 4 === 3) addDrum(barStart + beat * 3.75, 0.22, false);
}

for (let bar = 0; bar < bars; bar++) {
  const phrase = bar < 8 ? phraseA : bar < 16 ? phraseB : phraseC;
  const barStart = bar * beatsPerBar * beat;
  for (let step = 0; step < 4; step++) {
    const n = phrase[(bar * 4 + step) % phrase.length];
    addPluck(barStart + step * beat, n, beat * 1.55, step % 2 ? 0.11 : 0.16, step % 2 ? 0.25 : -0.2);
    if ((bar + step) % 3 === 0) addPluck(barStart + step * beat + beat * 0.5, n + 12, beat * 0.8, 0.045);
  }
  if (bar % 2 === 1) addPluck(barStart + beat * 2.75, phrase[(bar * 3) % phrase.length] - 12, beat, 0.075);
}

for (let i = 0; i < length; i++) {
  const t = i / sampleRate;
  const loopFade = Math.min(1, t / 0.08, (duration - t) / 0.08);
  data[i] *= loopFade;
}

let peak = 0;
for (const v of data) peak = Math.max(peak, Math.abs(v));
const scale = peak > 0 ? 0.88 / peak : 1;

const bytes = Buffer.alloc(44 + length * 2);
bytes.write('RIFF', 0);
bytes.writeUInt32LE(36 + length * 2, 4);
bytes.write('WAVE', 8);
bytes.write('fmt ', 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(sampleRate, 24);
bytes.writeUInt32LE(sampleRate * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36);
bytes.writeUInt32LE(length * 2, 40);
for (let i = 0; i < length; i++) {
  const s = Math.round(clamp(data[i] * scale, -1, 1) * 32767);
  bytes.writeInt16LE(s, 44 + i * 2);
}

await mkdir(dirname(out), { recursive: true });
await writeFile(out, bytes);
console.log(`${out} ${(bytes.length / 1024 / 1024).toFixed(2)} MiB ${duration.toFixed(1)}s`);
