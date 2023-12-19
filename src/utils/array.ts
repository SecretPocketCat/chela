export function indexOf<T>(arr: T[], item: T | undefined): number | undefined {
  if (item == undefined) {
    return undefined;
  }

  return indexOrUndefined(arr.indexOf(item));
}

export function indexOrUndefined(index: number): number | undefined {
  return index >= 0 ? index : undefined;
}
