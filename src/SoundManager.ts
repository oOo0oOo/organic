export class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor(soundFiles: { [key: string]: string }) {
    for (const [key, path] of Object.entries(soundFiles)) {
      const audio = new Audio(path);
      this.sounds.set(key, audio);
    }
  }

  public play(soundKey: string) {
    const sound = this.sounds.get(soundKey);
    if (sound) {
      sound.currentTime = 0;
      sound.play();
    }
  }
}