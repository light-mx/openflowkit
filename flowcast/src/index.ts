/**
 * FlowCast — interactive, animated architecture diagrams that publish cleanly
 * into documentation ecosystems (Confluence first).
 *
 * Public API surface. The canonical schema is the source of truth; adapters
 * derive every export from it.
 */

export * from './schema.js';
export { toMermaid } from './mermaid.js';
export { toDrawioXml } from './drawio.js';
export {
  buildConfluencePublishBundle,
  toConfluenceMermaid,
  toConfluenceDrawio,
  toConfluenceMediaEmbed,
  type ConfluencePublishBundle,
  type ConfluenceMermaidOutput,
  type ConfluenceDrawioOutput,
  type ConfluenceMediaEmbed,
  type PublishBundleOptions,
  type MermaidOptions,
  type MediaKind,
} from './confluence.js';
