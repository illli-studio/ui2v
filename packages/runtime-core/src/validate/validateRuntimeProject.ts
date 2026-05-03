export interface RuntimeValidationIssue {
  code: string;
  message: string;
  path: string;
}

export interface RuntimeValidationResult {
  valid: boolean;
  errors: RuntimeValidationIssue[];
  warnings: RuntimeValidationIssue[];
}

export function validateRuntimeProject(project: Record<string, any>): RuntimeValidationResult {
  const errors: RuntimeValidationIssue[] = [];
  const warnings: RuntimeValidationIssue[] = [];
  const seenIds = new Set<string>();

  if (!isObject(project)) {
    return {
      valid: false,
      errors: [issue('INVALID_PROJECT', 'Project must be an object', '$')],
      warnings,
    };
  }

  if (!project.id || typeof project.id !== 'string') {
    errors.push(issue('MISSING_ID', 'Project id must be a non-empty string', '$.id'));
  }

  if (!isPositiveNumber(project.duration)) {
    errors.push(issue('INVALID_DURATION', 'Project duration must be a positive number', '$.duration'));
  }

  if (!isPositiveNumber(project.fps)) {
    errors.push(issue('INVALID_FPS', 'Project fps must be a positive number', '$.fps'));
  } else if (project.fps > 120) {
    warnings.push(issue('HIGH_FPS', `Project fps ${project.fps} is high`, '$.fps'));
  }

  if (!isObject(project.resolution) || !isPositiveNumber(project.resolution.width) || !isPositiveNumber(project.resolution.height)) {
    errors.push(issue('INVALID_RESOLUTION', 'Resolution must be { width, height } with positive numbers', '$.resolution'));
  }

  if (project.schema === 'uiv-runtime') {
    validateRuntimeScene(project, errors, warnings, seenIds);
    validateRuntimeSegments(project, errors, warnings, seenIds);
  } else {
    validateLegacyTemplate(project, errors, warnings, seenIds);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateRuntimeScene(
  project: Record<string, any>,
  errors: RuntimeValidationIssue[],
  warnings: RuntimeValidationIssue[],
  seenIds: Set<string>
): void {
  if (!isObject(project.scene)) {
    errors.push(issue('MISSING_SCENE', 'Runtime project requires scene object', '$.scene'));
    return;
  }

  const root = project.scene.root;
  if (!isObject(root)) {
    errors.push(issue('MISSING_ROOT', 'Runtime scene requires root node', '$.scene.root'));
    return;
  }

  validateRuntimeNode(root, '$.scene.root', errors, warnings, seenIds, true);
}

function validateRuntimeNode(
  node: Record<string, any>,
  path: string,
  errors: RuntimeValidationIssue[],
  warnings: RuntimeValidationIssue[],
  seenIds: Set<string>,
  isRoot = false
): void {
  if (!node.id || typeof node.id !== 'string') {
    errors.push(issue('MISSING_NODE_ID', 'Scene node id must be a non-empty string', `${path}.id`));
  } else if (seenIds.has(node.id)) {
    errors.push(issue('DUPLICATE_NODE_ID', `Duplicate scene node id: ${node.id}`, `${path}.id`));
  } else {
    seenIds.add(node.id);
  }

  if (!node.type || typeof node.type !== 'string') {
    errors.push(issue('MISSING_NODE_TYPE', 'Scene node type must be a non-empty string', `${path}.type`));
  }

  if (node.startTime !== undefined && !isNonNegativeNumber(node.startTime)) {
    errors.push(issue('INVALID_START_TIME', 'Node startTime must be >= 0', `${path}.startTime`));
  }

  if (node.duration !== undefined && !isPositiveNumber(node.duration)) {
    errors.push(issue('INVALID_NODE_DURATION', 'Node duration must be a positive number', `${path}.duration`));
  }

  if (node.endTime !== undefined && !isPositiveNumber(node.endTime)) {
    errors.push(issue('INVALID_END_TIME', 'Node endTime must be a positive number', `${path}.endTime`));
  }

  if (node.opacity !== undefined && (!isFiniteNumber(node.opacity) || node.opacity < 0 || node.opacity > 1)) {
    warnings.push(issue('OPACITY_OUT_OF_RANGE', 'Node opacity should be between 0 and 1', `${path}.opacity`));
  }

  validateMotionTracks(node.motion ?? node.animations, `${path}.motion`, errors);

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      errors.push(issue('INVALID_CHILDREN', 'Node children must be an array', `${path}.children`));
    } else {
      node.children.forEach((child: unknown, index: number) => {
        if (!isObject(child)) {
          errors.push(issue('INVALID_CHILD_NODE', 'Child node must be an object', `${path}.children[${index}]`));
        } else {
          validateRuntimeNode(child, `${path}.children[${index}]`, errors, warnings, seenIds);
        }
      });
    }
  }

  if (isRoot && node.type !== 'root') {
    warnings.push(issue('ROOT_TYPE', 'Root node type should be "root"', `${path}.type`));
  }
}

function validateRuntimeSegments(
  project: Record<string, any>,
  errors: RuntimeValidationIssue[],
  warnings: RuntimeValidationIssue[],
  seenIds: Set<string>
): void {
  if (project.timeline !== undefined && !isObject(project.timeline)) {
    errors.push(issue('INVALID_TIMELINE', 'timeline must be an object', '$.timeline'));
    return;
  }

  const rawSegments = project.timeline?.segments ?? project.segments;
  if (rawSegments === undefined) {
    return;
  }

  const path = project.timeline?.segments !== undefined ? '$.timeline.segments' : '$.segments';
  if (!Array.isArray(rawSegments)) {
    errors.push(issue('INVALID_SEGMENTS', 'Segments must be an array', path));
    return;
  }

  const duration = isPositiveNumber(project.duration) ? project.duration : Number.POSITIVE_INFINITY;
  const segmentIds = new Set<string>();
  const normalized: Array<{ id: string; startTime: number; endTime: number; path: string }> = [];

  rawSegments.forEach((segment: unknown, index: number) => {
    const segmentPath = `${path}[${index}]`;
    if (!isObject(segment)) {
      errors.push(issue('INVALID_SEGMENT', 'Segment must be an object', segmentPath));
      return;
    }

    if (!segment.id || typeof segment.id !== 'string') {
      errors.push(issue('MISSING_SEGMENT_ID', 'Segment id must be a non-empty string', `${segmentPath}.id`));
      return;
    }

    if (segmentIds.has(segment.id)) {
      errors.push(issue('DUPLICATE_SEGMENT_ID', `Duplicate segment id: ${segment.id}`, `${segmentPath}.id`));
    } else {
      segmentIds.add(segment.id);
    }

    if (segment.startTime !== undefined && !isNonNegativeNumber(segment.startTime)) {
      errors.push(issue('INVALID_SEGMENT_START', 'Segment startTime must be >= 0', `${segmentPath}.startTime`));
    }

    if (segment.duration !== undefined && !isPositiveNumber(segment.duration)) {
      errors.push(issue('INVALID_SEGMENT_DURATION', 'Segment duration must be a positive number', `${segmentPath}.duration`));
    }

    if (segment.endTime !== undefined && !isPositiveNumber(segment.endTime)) {
      errors.push(issue('INVALID_SEGMENT_END', 'Segment endTime must be a positive number', `${segmentPath}.endTime`));
    }

    const startTime = isFiniteNumber(segment.startTime) ? segment.startTime : 0;
    const endTime = isFiniteNumber(segment.endTime)
      ? segment.endTime
      : startTime + (isFiniteNumber(segment.duration) ? segment.duration : duration);

    if (Number.isFinite(endTime) && endTime <= startTime) {
      errors.push(issue('SEGMENT_EMPTY_RANGE', 'Segment endTime must be greater than startTime', segmentPath));
    }

    if (Number.isFinite(duration)) {
      if (startTime > duration) {
        errors.push(issue('SEGMENT_START_AFTER_DURATION', `Segment starts after project duration (${duration}s)`, `${segmentPath}.startTime`));
      }
      if (endTime > duration) {
        errors.push(issue('SEGMENT_END_AFTER_DURATION', `Segment ends after project duration (${duration}s)`, `${segmentPath}.endTime`));
      }
    }

    if (segment.code !== undefined && typeof segment.code !== 'string') {
      errors.push(issue('INVALID_SEGMENT_CODE', 'Segment code must be a string', `${segmentPath}.code`));
    }

    if (segment.customCode !== undefined && typeof segment.customCode !== 'string') {
      errors.push(issue('INVALID_SEGMENT_CUSTOM_CODE', 'Segment customCode must be a string', `${segmentPath}.customCode`));
    }

    validateDependencyList(segment.dependencies, `${segmentPath}.dependencies`, errors);
    validateSegmentChildren(segment, segmentPath, seenIds, errors, warnings);

    if (segment.code || segment.customCode) {
      const generatedId = `${segment.id}-custom-code`;
      if (seenIds.has(generatedId)) {
        errors.push(issue('DUPLICATE_GENERATED_NODE_ID', `Generated segment node id conflicts: ${generatedId}`, `${segmentPath}.id`));
      } else {
        seenIds.add(generatedId);
      }
    }

    if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime) {
      normalized.push({ id: segment.id, startTime, endTime, path: segmentPath });
    }
  });

  validateSegmentCoverage(normalized, duration, warnings);
}

function validateSegmentChildren(
  segment: Record<string, any>,
  segmentPath: string,
  seenIds: Set<string>,
  errors: RuntimeValidationIssue[],
  warnings: RuntimeValidationIssue[]
): void {
  const groups = [
    ['layers', segment.layers],
    ['nodes', segment.nodes],
    ['children', segment.children],
  ] as const;

  for (const [key, value] of groups) {
    if (value === undefined) {
      continue;
    }
    const path = `${segmentPath}.${key}`;
    if (!Array.isArray(value)) {
      errors.push(issue('INVALID_SEGMENT_CHILDREN', `Segment ${key} must be an array`, path));
      continue;
    }

    value.forEach((node: unknown, index: number) => {
      if (!isObject(node)) {
        errors.push(issue('INVALID_SEGMENT_NODE', 'Segment node must be an object', `${path}[${index}]`));
        return;
      }
      validateSegmentNode(node, `${path}[${index}]`, `${segment.id}-layer-${index + 1}`, seenIds, errors, warnings);
    });
  }
}

function validateSegmentNode(
  node: Record<string, any>,
  path: string,
  generatedId: string,
  seenIds: Set<string>,
  errors: RuntimeValidationIssue[],
  warnings: RuntimeValidationIssue[]
): void {
  const id = typeof node.id === 'string' && node.id.length > 0 ? node.id : generatedId;
  if (seenIds.has(id)) {
    errors.push(issue('DUPLICATE_NODE_ID', `Duplicate scene node id: ${id}`, node.id ? `${path}.id` : path));
  } else {
    seenIds.add(id);
  }

  if (node.type !== undefined && typeof node.type !== 'string') {
    errors.push(issue('INVALID_NODE_TYPE', 'Segment node type must be a string when provided', `${path}.type`));
  }

  if (node.startTime !== undefined && !isNonNegativeNumber(node.startTime)) {
    errors.push(issue('INVALID_START_TIME', 'Segment node startTime must be >= 0', `${path}.startTime`));
  }

  if (node.duration !== undefined && !isPositiveNumber(node.duration)) {
    errors.push(issue('INVALID_NODE_DURATION', 'Segment node duration must be a positive number', `${path}.duration`));
  }

  if (node.endTime !== undefined && !isPositiveNumber(node.endTime)) {
    errors.push(issue('INVALID_END_TIME', 'Segment node endTime must be a positive number', `${path}.endTime`));
  }

  if (node.opacity !== undefined && (!isFiniteNumber(node.opacity) || node.opacity < 0 || node.opacity > 1)) {
    warnings.push(issue('OPACITY_OUT_OF_RANGE', 'Segment node opacity should be between 0 and 1', `${path}.opacity`));
  }

  validateDependencyList(node.dependencies ?? node.properties?.dependencies, `${path}.dependencies`, errors);
  validateMotionTracks(node.motion ?? node.animations, `${path}.motion`, errors);

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      errors.push(issue('INVALID_CHILDREN', 'Segment node children must be an array', `${path}.children`));
    } else {
      node.children.forEach((child: unknown, index: number) => {
        if (!isObject(child)) {
          errors.push(issue('INVALID_CHILD_NODE', 'Segment child node must be an object', `${path}.children[${index}]`));
        } else {
          validateSegmentNode(child, `${path}.children[${index}]`, `${id}-child-${index + 1}`, seenIds, errors, warnings);
        }
      });
    }
  }
}

function validateSegmentCoverage(
  segments: Array<{ id: string; startTime: number; endTime: number; path: string }>,
  duration: number,
  warnings: RuntimeValidationIssue[]
): void {
  if (segments.length === 0 || !Number.isFinite(duration)) {
    return;
  }

  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  let cursor = 0;
  let previous = sorted[0];

  for (const segment of sorted) {
    if (segment.startTime > cursor) {
      warnings.push(issue(
        'SEGMENT_GAP',
        `Timeline has a gap from ${formatTime(cursor)}s to ${formatTime(segment.startTime)}s before segment "${segment.id}"`,
        segment.path
      ));
    } else if (segment.startTime < cursor) {
      warnings.push(issue(
        'SEGMENT_OVERLAP',
        `Segment "${segment.id}" overlaps previous segment "${previous.id}" from ${formatTime(segment.startTime)}s to ${formatTime(Math.min(cursor, segment.endTime))}s`,
        segment.path
      ));
    }

    if (segment.endTime >= cursor) {
      cursor = segment.endTime;
      previous = segment;
    }
  }

  if (cursor < duration) {
    warnings.push(issue(
      'SEGMENT_TRAILING_GAP',
      `Timeline has a trailing gap from ${formatTime(cursor)}s to ${formatTime(duration)}s`,
      '$.timeline.segments'
    ));
  }
}

function validateLegacyTemplate(
  project: Record<string, any>,
  errors: RuntimeValidationIssue[],
  warnings: RuntimeValidationIssue[],
  seenIds: Set<string>
): void {
  const layers = Array.isArray(project.template?.layers)
    ? project.template.layers
    : Array.isArray(project.layers)
      ? project.layers
      : undefined;

  if (!layers) {
    errors.push(issue('MISSING_LAYERS', 'Project must include template.layers, layers, or runtime scene', '$.template.layers'));
    return;
  }

  layers.forEach((layer: unknown, index: number) => {
    const path = `$.template.layers[${index}]`;
    if (!isObject(layer)) {
      errors.push(issue('INVALID_LAYER', 'Layer must be an object', path));
      return;
    }

    if (!layer.id || typeof layer.id !== 'string') {
      errors.push(issue('MISSING_LAYER_ID', 'Layer id must be a non-empty string', `${path}.id`));
    } else if (seenIds.has(layer.id)) {
      errors.push(issue('DUPLICATE_LAYER_ID', `Duplicate layer id: ${layer.id}`, `${path}.id`));
    } else {
      seenIds.add(layer.id);
    }

    if (!layer.type || typeof layer.type !== 'string') {
      errors.push(issue('MISSING_LAYER_TYPE', 'Layer type must be a non-empty string', `${path}.type`));
    }

    validateMotionTracks(layer.animations, `${path}.animations`, errors);
  });
}

function validateMotionTracks(value: unknown, path: string, errors: RuntimeValidationIssue[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(issue('INVALID_MOTION', 'Motion tracks must be an array', path));
    return;
  }

  value.forEach((track, index) => {
    const trackPath = `${path}[${index}]`;
    if (!isObject(track)) {
      errors.push(issue('INVALID_MOTION_TRACK', 'Motion track must be an object', trackPath));
      return;
    }

    if (!track.property || typeof track.property !== 'string') {
      errors.push(issue('MISSING_MOTION_PROPERTY', 'Motion track property must be a string', `${trackPath}.property`));
    }

    if (!isNonNegativeNumber(track.startTime)) {
      errors.push(issue('INVALID_MOTION_START', 'Motion track startTime must be >= 0', `${trackPath}.startTime`));
    }

    if (!isPositiveNumber(track.duration)) {
      errors.push(issue('INVALID_MOTION_DURATION', 'Motion track duration must be a positive number', `${trackPath}.duration`));
    }
  });
}

function validateDependencyList(value: unknown, path: string, errors: RuntimeValidationIssue[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(issue('INVALID_DEPENDENCIES', 'Dependencies must be an array of strings', path));
    return;
  }

  value.forEach((dependency, index) => {
    if (typeof dependency !== 'string' || dependency.trim().length === 0) {
      errors.push(issue('INVALID_DEPENDENCY', 'Dependency must be a non-empty string', `${path}[${index}]`));
    }
  });
}

function issue(code: string, message: string, path: string): RuntimeValidationIssue {
  return { code, message, path };
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function formatTime(value: number): string {
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
