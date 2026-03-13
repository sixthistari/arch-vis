export interface SelectionHandlers {
  onElementClick: (elementId: string) => void;
  onElementDoubleClick: (elementId: string) => void;
  onBackgroundClick: () => void;
}
