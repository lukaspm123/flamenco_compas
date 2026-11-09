/*
 * Tap-Tempo: BPM aus den Abständen der letzten Tipps.
 */
export class TapTempo {
  private taps: number[] = [];

  /**
   * @param maxTaps    über wie viele Tipps gemittelt wird
   * @param resetAfter Pause in ms, nach der die Messung neu beginnt
   */
  constructor(
    private readonly maxTaps = 6,
    private readonly resetAfter = 2000,
  ) {}

  /** Registriert einen Tipp zum Zeitpunkt `now` (ms) und liefert BPM ab dem zweiten Tipp. */
  tap(now: number): number | null {
    const last = this.taps[this.taps.length - 1];
    if (last !== undefined && now - last > this.resetAfter) this.taps = [];
    this.taps.push(now);
    if (this.taps.length > this.maxTaps) this.taps.shift();
    if (this.taps.length < 2) return null;
    const avg = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
    return avg > 0 ? 60000 / avg : null;
  }
}
