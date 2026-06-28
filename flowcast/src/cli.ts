#!/usr/bin/env node
/**
 * flowcast-confluence — light CLI wrapper around the Confluence helper.
 *
 * Usage:
 *   flowcast-confluence <diagram.json> [options]
 *
 * Options:
 *   --media <file>        Attachment filename to embed (repeatable).
 *   --mermaid-macro <n>   Mermaid app macro name (default: mermaid).
 *   --out <file>          Write the storage-format page to a file.
 *   --mode <mode>         Print one section: page | mermaid | drawio | bundle.
 *   -h, --help            Show this help.
 *
 * This is intentionally minimal — the real surface is the library API. It
 * exists so a diagram can be turned into Confluence-ready output from a script
 * or CI step without wiring up the editor UI.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { buildConfluencePublishBundle } from './confluence.js';
import { type DiagramDoc } from './schema.js';

interface CliArgs {
  input?: string;
  media: string[];
  mermaidMacro?: string;
  out?: string;
  mode: 'page' | 'mermaid' | 'drawio' | 'bundle';
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { media: [], mode: 'page', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else if (arg === '--media') {
      const value = argv[(i += 1)];
      if (value) args.media.push(value);
    } else if (arg === '--mermaid-macro') {
      args.mermaidMacro = argv[(i += 1)];
    } else if (arg === '--out') {
      args.out = argv[(i += 1)];
    } else if (arg === '--mode') {
      args.mode = argv[(i += 1)] as CliArgs['mode'];
    } else if (!arg.startsWith('-') && !args.input) {
      args.input = arg;
    }
  }
  return args;
}

const HELP = `flowcast-confluence — turn a canonical diagram into Confluence-ready output

Usage:
  flowcast-confluence <diagram.json> [options]

Options:
  --media <file>        Attachment filename to embed (repeatable)
  --mermaid-macro <n>   Mermaid app macro name (default: mermaid)
  --out <file>          Write the storage-format page to a file
  --mode <mode>         page | mermaid | drawio | bundle (default: page)
  -h, --help            Show this help`;

function run(argv: string[]): number {
  const args = parseArgs(argv);
  if (args.help || !args.input) {
    process.stdout.write(HELP + '\n');
    return args.help ? 0 : 1;
  }

  let doc: DiagramDoc;
  try {
    doc = JSON.parse(readFileSync(args.input, 'utf8')) as DiagramDoc;
  } catch (error) {
    process.stderr.write(`Failed to read ${args.input}: ${String(error)}\n`);
    return 1;
  }

  const bundle = buildConfluencePublishBundle(doc, {
    mediaFiles: args.media,
    mermaidMacroName: args.mermaidMacro,
  });

  let output: string;
  switch (args.mode) {
    case 'mermaid':
      output = bundle.mermaid?.mermaid ?? '(diagram type is not Mermaid-expressible)';
      break;
    case 'drawio':
      output = bundle.drawio.mxGraphXml;
      break;
    case 'bundle':
      output = JSON.stringify(bundle, null, 2);
      break;
    case 'page':
    default:
      output = bundle.storageFormatPage;
      break;
  }

  if (args.out) {
    writeFileSync(args.out, output + '\n');
    process.stderr.write(`Wrote ${args.mode} to ${args.out}\n`);
  } else {
    process.stdout.write(output + '\n');
  }

  for (const note of bundle.notes) {
    process.stderr.write(`note: ${note}\n`);
  }
  return 0;
}

process.exit(run(process.argv.slice(2)));
