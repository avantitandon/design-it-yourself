const PLUGIN_DATA_KEY = 'ontario.design-system.mappings.v2';

type OntarioComponent =
  | 'ontario-button'
  | 'ontario-text-input'
  | 'ontario-header';

interface MappingTarget {
  pageId: string;
  pageName: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
}

interface StoredMappingSet {
  version: 2;
  mappings: Partial<Record<OntarioComponent, MappingTarget>>;
}

interface SelectionState {
  selectionCount: number;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  mapping?: OntarioComponent;
}

type UiMessage =
  | { type: 'ui-ready' }
  | { type: 'export-mappings' }
  | { type: 'save-mapping'; component: OntarioComponent; nodeId: string }
  | { type: 'clear-mapping'; nodeId: string };

const COMPONENTS: readonly OntarioComponent[] = [
  'ontario-button',
  'ontario-text-input',
  'ontario-header',
];

function isOntarioComponent(value: unknown): value is OntarioComponent {
  return typeof value === 'string' && COMPONENTS.includes(value as OntarioComponent);
}

function emptyMappingSet(): StoredMappingSet {
  return { version: 2, mappings: {} };
}

function readMappingSet(): StoredMappingSet {
  const value = figma.root.getPluginData(PLUGIN_DATA_KEY);
  if (!value) return emptyMappingSet();

  try {
    const stored = JSON.parse(value) as Partial<StoredMappingSet>;
    return stored.version === 2 && stored.mappings
      ? { version: 2, mappings: stored.mappings }
      : emptyMappingSet();
  } catch {
    return emptyMappingSet();
  }
}

function writeMappingSet(mappingSet: StoredMappingSet): void {
  figma.root.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(mappingSet));
}

function readMappingForNode(nodeId: string): OntarioComponent | undefined {
  const mappings = readMappingSet().mappings;
  return COMPONENTS.find((component) => mappings[component]?.nodeId === nodeId);
}

function getSelectionState(): SelectionState {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) return { selectionCount: selection.length };

  const node = selection[0];
  return {
    selectionCount: 1,
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    mapping: readMappingForNode(node.id),
  };
}

function sendSelectionState(): void {
  figma.ui.postMessage({ type: 'selection-state', state: getSelectionState() });
}

function getSingleSelectedNode(): SceneNode | undefined {
  const selection = figma.currentPage.selection;
  return selection.length === 1 ? selection[0] : undefined;
}

function exportFileName(): string {
  const documentName = figma.root.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${documentName || 'figma'}-ontario-mappings.json`;
}

function exportMappings(): void {
  const storedMappings = readMappingSet().mappings;
  const mappings = {
    'ontario-button': storedMappings['ontario-button'] ?? null,
    'ontario-text-input': storedMappings['ontario-text-input'] ?? null,
    'ontario-header': storedMappings['ontario-header'] ?? null,
  };
  const mappingCount = Object.values(mappings).filter(Boolean).length;

  figma.ui.postMessage({
    type: 'export-data',
    fileName: exportFileName(),
    data: {
      version: 2,
      document: { id: figma.root.id, name: figma.root.name },
      exportedAt: new Date().toISOString(),
      mappings,
    },
  });
  figma.notify(
    mappingCount === 1
      ? 'Exported 1 Ontario mapping.'
      : `Exported ${mappingCount} Ontario mappings.`,
  );
}

figma.showUI(__html__, { width: 360, height: 480, themeColors: true });
figma.on('selectionchange', sendSelectionState);

figma.ui.onmessage = (message: UiMessage) => {
  if (message.type === 'ui-ready') {
    sendSelectionState();
    return;
  }

  if (message.type === 'export-mappings') {
    exportMappings();
    return;
  }

  const node = getSingleSelectedNode();
  if (!node || node.id !== message.nodeId) {
    figma.notify('Select exactly one layer to update its mapping.', { error: true });
    sendSelectionState();
    return;
  }

  if (message.type === 'save-mapping') {
    if (!isOntarioComponent(message.component)) {
      figma.notify('That Ontario component is not supported.', { error: true });
      return;
    }

    const mappingSet = readMappingSet();
    for (const component of COMPONENTS) {
      if (mappingSet.mappings[component]?.nodeId === node.id) {
        delete mappingSet.mappings[component];
      }
    }
    mappingSet.mappings[message.component] = {
      pageId: figma.currentPage.id,
      pageName: figma.currentPage.name,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
    };
    writeMappingSet(mappingSet);
    figma.notify(`Mapped “${node.name}” successfully.`);
    sendSelectionState();
    return;
  }

  if (message.type === 'clear-mapping') {
    const mappingSet = readMappingSet();
    for (const component of COMPONENTS) {
      if (mappingSet.mappings[component]?.nodeId === node.id) {
        delete mappingSet.mappings[component];
      }
    }
    writeMappingSet(mappingSet);
    figma.notify(`Removed the mapping from “${node.name}”.`);
    sendSelectionState();
  }
};
