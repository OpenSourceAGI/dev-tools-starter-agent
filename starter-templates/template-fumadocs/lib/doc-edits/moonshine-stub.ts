/**
 * @file moonshine-stub.ts
 * @description Stands in for `@moonshine-ai/moonshine-js`, which react-reason-editor
 * reaches (via use-voice-control) only for voice dictation. Its published bundle
 * points at ONNX runtime files it doesn't ship, so bundlers can't resolve it.
 * `next.config.ts` aliases the package here; dictation reports itself unavailable.
 */
export class MicrophoneTranscriber {
  constructor() {
    throw new Error('Voice dictation is not available in the docs editor.');
  }
}

export default { MicrophoneTranscriber };
