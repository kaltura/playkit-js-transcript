enum ChangeTypes {
  Show = 'show',
  Hide = 'hide',
}

type ChangeData<T extends Cuepoint> = {
  time: number;
  type: ChangeTypes;
  cuePoint: T;
};

const DefaultReasonableSeekThreshold = 2000;

export interface Cuepoint {
  startTime: number;
  endTime?: number;
}

export interface CuepointEngineOptions {
  reasonableSeekThreshold: number;
}

export interface UpdateTimeResponse<T extends Cuepoint> {
  snapshot?: T[];
  delta?: {
    show: T[];
    hide: T[];
  };
}

export class CuepointEngine<T extends Cuepoint> {
  protected _cuepoints: T[];
  private reasonableSeekThreshold: number;
  private isFirstTime = true;
  protected enabled = true;
  private lastHandledTime: number | null = null;
  private lastHandledTimeIndex: number | null = null;
  private nextTimeToHandle: number | null = null;
  private cuepointChanges: ChangeData<T>[] = [];

  constructor(cuepoints: T[], options?: CuepointEngineOptions) {
    this.reasonableSeekThreshold = Math.max(
      DefaultReasonableSeekThreshold,
      (options && options.reasonableSeekThreshold) || 0
    );
    this._cuepoints = cuepoints;
    this.prepareCuepoint();
  }

  get cuepoints(): T[] {
    return [...this._cuepoints];
  }

  public getSnapshot(time: number): T[] {
    const timeIndex = this.findClosestLastIndexByTime(time);
    return this.createCuepointSnapshot(timeIndex);
  }

  public updateTime(
    currentTime: number,
    forceSnapshot = false,
    filter?: (item: T) => boolean
  ): UpdateTimeResponse<T> {
    const {isFirstTime, lastHandledTime, nextTimeToHandle} = this;

    if (this.cuepointChanges.length === 0) {
      if (isFirstTime) {
        this.isFirstTime = false;
      }
      return {snapshot: []};
    }

    const userSeeked =
      !isFirstTime &&
      lastHandledTime !== null &&
      nextTimeToHandle !== null &&
      (lastHandledTime > currentTime ||
        currentTime - nextTimeToHandle > this.reasonableSeekThreshold);
    const hasChangesToHandle =
      isFirstTime ||
      (this.lastHandledTime !== null && this.lastHandledTime > currentTime) ||
      (this.nextTimeToHandle != null && currentTime >= this.nextTimeToHandle);
    const closestChangeIndex = this.findClosestLastIndexByTime(currentTime);
    const closestChangeTime =
      closestChangeIndex < 0
        ? 0
        : this.cuepointChanges[closestChangeIndex].time;

    if (!hasChangesToHandle) {
      if (forceSnapshot) {
        return {
          snapshot: this.createCuepointSnapshot(closestChangeIndex, filter),
        };
      }

      return {delta: this.createEmptyDelta()};
    }

    if (isFirstTime || forceSnapshot || userSeeked) {
      const snapshot = this.createCuepointSnapshot(closestChangeIndex, filter);
      this.updateInternals(closestChangeTime, closestChangeIndex);

      return {snapshot};
    }

    const delta = this.createCuepointDelta(closestChangeIndex, filter);
    this.updateInternals(closestChangeTime, closestChangeIndex);

    return {delta};
  }

  protected getCurrentCuepointSnapshot(): T[] {
    return this.lastHandledTimeIndex
      ? this.createCuepointSnapshot(this.lastHandledTimeIndex)
      : [];
  }

  private createCuepointSnapshot(
    targetIndex: number,
    filter?: (item: T) => boolean
  ): T[] {
    if (
      !this.enabled ||
      targetIndex < 0 ||
      !this.cuepointChanges ||
      this.cuepointChanges.length === 0
    ) {
      return [];
    }

    let snapshot: T[] = [];

    for (let index = 0; index <= targetIndex; index++) {
      const item = this.cuepointChanges[index];
      const cuepointIndex = snapshot.indexOf(item.cuePoint);
      if (item.type === ChangeTypes.Show) {
        if (cuepointIndex === -1) {
          snapshot.push(item.cuePoint);
        }
      } else {
        if (cuepointIndex !== -1) {
          snapshot.splice(cuepointIndex, 1);
        }
      }
    }

    if (filter) {
      snapshot = snapshot.filter(filter);
    }

    return snapshot;
  }

  private createCuepointDelta(
    targetIndex: number,
    filter?: (item: T) => boolean
  ): {show: T[]; hide: T[]} {
    if (
      !this.enabled ||
      !this.cuepointChanges ||
      this.cuepointChanges.length === 0
    ) {
      return this.createEmptyDelta();
    }

    const {lastHandledTimeIndex} = this;

    if (lastHandledTimeIndex === null) {
      return this.createEmptyDelta();
    }

    let newCuepoint: T[] = [];
    let removedCuepoint: T[] = [];

    for (let index = lastHandledTimeIndex + 1; index <= targetIndex; index++) {
      const item = this.cuepointChanges[index];
      const cuepointIndex = newCuepoint.indexOf(item.cuePoint);
      if (item.type === ChangeTypes.Show) {
        if (cuepointIndex === -1) {
          newCuepoint.push(item.cuePoint);
        }
      } else {
        if (cuepointIndex !== -1) {
          newCuepoint.splice(cuepointIndex, 1);
          removedCuepoint.push(item.cuePoint);
        }
      }
    }

    if (filter) {
      newCuepoint = newCuepoint.filter(filter);
      removedCuepoint = removedCuepoint.filter(filter);
    }

    return {show: newCuepoint, hide: removedCuepoint};
  }

  private updateInternals(time: number, timeIndex: number) {
    const {cuepointChanges} = this;

    if (!cuepointChanges || cuepointChanges.length === 0) {
      return;
    }

    const isIndexOfLastChange = timeIndex >= cuepointChanges.length - 1;
    const isIndexBeforeTheFirstChange = timeIndex === null;
    this.lastHandledTime = time;
    this.lastHandledTimeIndex = timeIndex;
    this.nextTimeToHandle = isIndexBeforeTheFirstChange
      ? cuepointChanges[0].time
      : isIndexOfLastChange
      ? cuepointChanges[cuepointChanges.length - 1].time
      : cuepointChanges[timeIndex + 1].time;
    this.isFirstTime = false;
  }

  private createEmptyDelta(): {
    show: T[];
    hide: T[];
  } {
    return {show: [], hide: []};
  }

  private binarySearch(items: ChangeData<T>[], value: number): number | null {
    if (!items || items.length === 0) {
      // empty array, no index to return
      return null;
    }

    if (value < items[0].time) {
      // value less then the first item. return -1
      return -1;
    }
    if (value > items[items.length - 1].time) {
      // value bigger then the last item, return last item index
      return items.length - 1;
    }

    let lo = 0;
    let hi = items.length - 1;

    while (lo <= hi) {
      const mid = Math.floor((hi + lo + 1) / 2);

      if (value < items[mid].time) {
        hi = mid - 1;
      } else if (value > items[mid].time) {
        lo = mid + 1;
      } else {
        return mid;
      }
    }

    return Math.min(lo, hi); // return the lowest index which represent the last visual item
  }

  private findClosestLastIndexByTime(time: number): number {
    const changes = this.cuepointChanges;
    let closestIndex = this.binarySearch(changes, time);

    if (closestIndex === null) {
      return -1;
    }

    const changesLength = changes.length;
    while (
      closestIndex < changesLength - 1 &&
      changes[closestIndex + 1].time === time
    ) {
      closestIndex++;
    }

    return closestIndex;
  }

  private prepareCuepoint() {
    (this._cuepoints || []).forEach(cuepoint => {
      if (
        cuepoint.startTime !== null &&
        typeof cuepoint.startTime !== 'undefined' &&
        cuepoint.startTime >= 0
      ) {
        this.cuepointChanges.push({
          time: cuepoint.startTime,
          type: ChangeTypes.Show,
          cuePoint: cuepoint as T, // NOTICE: it is the responsability of this engine not to return cuepoint without layout
        });
      }

      if (
        cuepoint.endTime !== null &&
        typeof cuepoint.endTime !== 'undefined' &&
        cuepoint.endTime >= 0
      ) {
        this.cuepointChanges.push({
          time: cuepoint.endTime,
          type: ChangeTypes.Hide,
          cuePoint: cuepoint as T, // NOTICE: it is the responsability of this engine not to return cuepoint without layout
        });
      }
    });

    this.cuepointChanges.sort((a, b) => {
      return a.time < b.time ? -1 : a.time === b.time ? 0 : 1;
    });
  }
}
