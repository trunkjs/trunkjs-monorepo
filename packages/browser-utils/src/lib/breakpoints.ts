export const breakpoints = [
  { name: 'xs', minWidth: 0 },
  { name: 'sm', minWidth: 576 },
  { name: 'md', minWidth: 768 },
  { name: 'lg', minWidth: 992 },
  { name: 'xl', minWidth: 1200 },
  { name: 'xxl', minWidth: 1400 },
] as const;

export const breakpointMap: { [key: string]: number } = breakpoints.reduce(
  (map, bp) => {
    map[bp.name] = bp.minWidth;
    return map;
  },
  {} as { [key: string]: number },
);

export function getBreakpointMinWidth(breakpoint: string): number {
  if (!(breakpoint in breakpointMap)) {
    throw new Error(`Unknown breakpoint: ${breakpoint}`);
  }
  return breakpointMap[breakpoint];
}

export function getCurrentBreakpoint(width?: number): string {
  if (width === undefined) {
    width = window.innerWidth;
  }
  for (let i = breakpoints.length - 1; i >= 0; i--) {
    if (width >= breakpoints[i].minWidth) {
      return breakpoints[i].name;
    }
  }
  return 'xs'; // Fallback, should not reach here
}
