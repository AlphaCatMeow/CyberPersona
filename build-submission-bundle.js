#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'submission-bundle');

const INCLUDE = [
  '.env.cyber-gf.example',
  '.gitignore',
  'cyber-gf-config.js',
  'cyber-gf-controller.js',
  'cyber-gf-profile.js',
  'cyber-gf-prompts.js',
  'cyber-gf-state.js',
  'cyber-gf-tts.js',
  'cyber-gf-turn.js',
  'openclaw-cyber-gf-adapter.js',
  'test-openclaw-cyber-gf-adapter.js',
  'test-openclaw-cyber-gf-live-loop.js',
  'CYBER_GIRLFRIEND.md',
  'PROJECT-STATUS.md',
  'RELEASE-NOTES-2026-04-29.md',
  'SUBMISSION-GUIDE.md',
  'COMMIT-CANDIDATES.md',
  'MAINTAINER-CHECKLIST.md',
  'AUTOMATION.md',
  'REPO-REORG-PLAN.md',
  'TTS-TAG-STYLE-GUIDE.md',
  'TTS-TESTS.md',
  'XIAOMI-TTS-CONFIG.md',
  '_sample_start_payload.json',
  '_sample_turn_payload.json',
  '_turn_flow_test.json',
  'verify-production-readiness.js',
  'build-submission-bundle.js',
  path.join('docs', 'architecture.md'),
  path.join('docs', 'cyber-girlfriend-mode.md'),
  path.join('docs', 'repository-scope.md'),
  path.join('docs', 'runtime-integration.md'),
  path.join('docs', 'setup-and-run.md'),
  path.join('docs', '架构说明.md'),
  path.join('tts-official-ab-test', 'CONCLUSION.md'),
  path.join('tts-official-ab-test', 'report.json')
];

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyOne(rel) {
  const src = path.join(ROOT, rel);
  const dst = path.join(OUT_DIR, rel);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing include path: ${rel}`);
  }
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function writeManifest() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRoot: ROOT,
    includes: INCLUDE,
    notes: [
      'This bundle is a curated submission-oriented snapshot.',
      'It excludes local secrets, runtime state, generated audio, and workspace memory.',
      'Production TTS strategy is tag_only with empty naturalStylePrompt.'
    ]
  };
  fs.writeFileSync(path.join(OUT_DIR, 'BUNDLE-MANIFEST.json'), JSON.stringify(manifest, null, 2));
}

function writeReadme() {
  const text = `# Submission Bundle\n\nThis directory is an automatically curated snapshot for review/submission.\n\n## Included\n\n- mainline Cyber Girlfriend runtime files\n- current production-path docs\n- curated sample payloads\n- production-readiness verifier\n- official A/B text/json conclusion artifacts\n\n## Excluded\n\n- live secrets\n- local state/history\n- workspace memory\n- generated audio\n- throwaway test payloads\n\n## Validate\n\nRun:\n\n\
node verify-production-readiness.js\n\
`;
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), text);
}

function main() {
  rmrf(OUT_DIR);
  ensureDir(OUT_DIR);
  for (const rel of INCLUDE) copyOne(rel);
  writeManifest();
  writeReadme();
  console.log(`submission-bundle-ready: ${OUT_DIR}`);
}

main();
