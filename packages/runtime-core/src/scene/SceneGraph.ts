import type { SceneGraphSnapshot, SceneNode } from '../types';

export class SceneGraph {
  private nodes = new Map<string, SceneNode>();
  private rootId: string;

  constructor(root: SceneNode) {
    this.rootId = root.id;
    this.nodes.set(root.id, cloneNode(root));
  }

  get root(): SceneNode {
    return this.getNodeOrThrow(this.rootId);
  }

  getNode(id: string): SceneNode | null {
    const node = this.nodes.get(id);
    return node ? cloneNode(node) : null;
  }

  addNode(node: SceneNode, parentId = this.rootId): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Scene node already exists: ${node.id}`);
    }

    const parent = this.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent scene node not found: ${parentId}`);
    }

    const nextNode = cloneNode({ ...node, parentId });
    parent.children.push(nextNode.id);
    this.nodes.set(nextNode.id, nextNode);
  }

  removeNode(id: string): void {
    if (id === this.rootId) {
      throw new Error('Cannot remove scene root node');
    }

    const node = this.nodes.get(id);
    if (!node) {
      return;
    }

    for (const childId of [...node.children]) {
      this.removeNode(childId);
    }

    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter(childId => childId !== id);
      }
    }

    this.nodes.delete(id);
  }

  updateNode(id: string, updater: (node: SceneNode) => SceneNode): void {
    const current = this.nodes.get(id);
    if (!current) {
      throw new Error(`Scene node not found: ${id}`);
    }
    this.nodes.set(id, cloneNode(updater(cloneNode(current))));
  }

  traverse(visitor: (node: SceneNode, depth: number) => void): void {
    const visit = (id: string, depth: number) => {
      const node = this.nodes.get(id);
      if (!node) {
        return;
      }
      visitor(cloneNode(node), depth);
      for (const childId of node.children) {
        visit(childId, depth + 1);
      }
    };

    visit(this.rootId, 0);
  }

  getRenderableNodes(): SceneNode[] {
    const nodes: SceneNode[] = [];
    this.traverse((node) => {
      if (node.id !== this.rootId) {
        nodes.push(node);
      }
    });

    return nodes.sort((a, b) => {
      if (a.zIndex === b.zIndex) {
        return a.id.localeCompare(b.id);
      }
      return a.zIndex - b.zIndex;
    });
  }

  snapshot(): SceneGraphSnapshot {
    return {
      rootId: this.rootId,
      nodes: Array.from(this.nodes.values()).map(cloneNode),
    };
  }

  private getNodeOrThrow(id: string): SceneNode {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Scene node not found: ${id}`);
    }
    return cloneNode(node);
  }
}

function cloneNode(node: SceneNode): SceneNode {
  return {
    ...node,
    children: [...node.children],
    timing: { ...node.timing },
    transform: { ...node.transform },
    properties: { ...node.properties },
    motion: node.motion.map(track => ({
      ...track,
      keyframes: track.keyframes?.map(keyframe => ({
        ...keyframe,
        properties: keyframe.properties ? { ...keyframe.properties } : undefined,
      })),
    })),
  };
}

