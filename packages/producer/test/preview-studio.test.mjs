import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  applyPreviewTimelineUpdates,
  applyPreviewClipMetadataUpdates,
  buildPreviewTimeline,
  createPreviewInspectSummary,
  splitPreviewClip,
  lintPreviewProject,
  summarizeTimelineLint,
} = require('../dist/index.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const runtimeProject = JSON.parse(readFileSync(resolve(root, 'examples/runtime-storyboard/animation.json'), 'utf8'));
const templateProject = JSON.parse(readFileSync(resolve(root, 'examples/library-timeline/animation.json'), 'utf8'));

const runtimeTimeline = buildPreviewTimeline(runtimeProject);
assert(runtimeTimeline.schema === 'uiv-runtime', 'runtime schema should be detected');
assert(runtimeTimeline.tracks.length === 1, 'runtime timeline should expose a segment track');
assert(runtimeTimeline.tracks[0].clips.length >= 3, 'runtime timeline should include segments');

const templateTimeline = buildPreviewTimeline(templateProject);
assert(templateTimeline.schema === 'template', 'template schema should be detected');
assert(templateTimeline.tracks.some(track => track.clips.some(clip => clip.id === 'beat-gsap')), 'template timeline should include beat layers');

const runtimeInspect = createPreviewInspectSummary(runtimeProject, 1);
assert(runtimeInspect.activeSegmentId, 'runtime inspect should resolve an active segment');
assert(Array.isArray(runtimeInspect.dependencies), 'runtime inspect should expose dependencies');

const templateInspect = createPreviewInspectSummary(templateProject, 1);
assert(templateInspect.activeClipIds.includes('beat-gsap'), 'template inspect should resolve active beat layer');

const patched = applyPreviewTimelineUpdates(runtimeProject, [{
  id: 'hook',
  kind: 'segment',
  startTime: 0,
  endTime: 2.8,
}]);
assert(patched.timeline.segments[0].endTime === 2.8, 'segment patch should update endTime');

const rippleTrim = applyPreviewTimelineUpdates(runtimeProject, [{
  id: 'hook',
  kind: 'segment',
  endTime: 2.5,
}], { mode: 'ripple' });
assert(rippleTrim.timeline.segments[0].endTime === 2.5, 'ripple trim should update edited segment end');
assert(rippleTrim.timeline.segments[1].startTime === 2.5, 'ripple trim should shift the next segment start');
assert(rippleTrim.timeline.segments[1].endTime === 5.8, 'ripple trim should preserve later segment duration');
assert(rippleTrim.timeline.segments[1].startTime === rippleTrim.timeline.segments[0].endTime, 'ripple trim should align segment boundaries');

const rippleTrimStart = applyPreviewTimelineUpdates(runtimeProject, [{
  id: 'proof',
  kind: 'segment',
  startTime: 3.5,
}], { mode: 'ripple' });
assert(rippleTrimStart.timeline.segments[0].endTime === 3.5, 'ripple trim-start should extend the previous segment end');
assert(rippleTrimStart.timeline.segments[1].startTime === 3.5, 'ripple trim-start should keep the edited segment start');
assert(rippleTrimStart.timeline.segments[2].startTime === rippleTrimStart.timeline.segments[1].endTime, 'ripple trim-start should pack later segments');

const split = splitPreviewClip(runtimeProject, { id: 'hook', kind: 'segment', time: 1.5 });
const splitSegments = split.timeline.segments;
assert(splitSegments.length === runtimeProject.timeline.segments.length + 1, 'split should insert a new segment');
assert(splitSegments[0].endTime === 1.5, 'split should trim original segment end');
assert(splitSegments[1].startTime === 1.5, 'split should start duplicate at split time');

const relabeled = applyPreviewClipMetadataUpdates(runtimeProject, [{
  id: 'hook',
  kind: 'segment',
  label: 'Opening Hook',
  dependencies: ['canvas2d', 'gsap'],
}]);
assert(relabeled.timeline.segments[0].label === 'Opening Hook', 'metadata patch should update segment label');

const lint = lintPreviewProject(templateProject);
const summary = summarizeTimelineLint(lint.lint);
assert(summary.ok, 'library-timeline lint should pass');
assert(lint.tracks.some(track => track.clips.length > 0), 'lint should include timeline tracks');

console.log('preview-studio.test.mjs passed');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
