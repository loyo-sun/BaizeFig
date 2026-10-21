import welcomeSource from "../design/BaizeFig-欢迎页.baizefig?raw";
import { id, validateDocument, type Document } from "./core";

/** Load the editable source without rebuilding or flattening its node tree. */
export function createWelcomeDocument(): Document {
  const doc: unknown = JSON.parse(welcomeSource);
  validateDocument(doc);
  // Each local welcome copy gets its own identity; internal references stay intact.
  doc.id = id();
  return doc;
}
