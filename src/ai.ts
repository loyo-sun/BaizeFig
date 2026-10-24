import { type Command, type Document, execute } from "./core";
export interface AIConfig {
  baseUrl: string;
  model: string;
  key: string;
  system: string;
}
export function chatCompletionsUrl(address: string): string {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    throw Error("Invalid API URL");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("Invalid API URL");
  const path = url.pathname.replace(/\/+$/, "");
  if (/\/responses$/.test(path))
    throw Error(
      "This connection uses Chat Completions. Enter a compatible API base URL instead of a Responses endpoint.",
    );
  url.pathname = /\/chat\/completions$/.test(path)
    ? path
    : `${path}/chat/completions`;
  url.hash = "";
  return url.toString();
}

export class ModelRequestError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Model request failed (${status})`);
  }
}

export function formatAIError(
  error: unknown,
  t: (message: string) => string,
): string {
  if (!(error instanceof ModelRequestError))
    return t(error instanceof Error ? error.message : String(error));
  const hints: Record<number, string> = {
    400: "The service rejected the request. Check its supported model and parameters.",
    401: "Authentication failed. Check the API key for this service.",
    403: "This key does not have permission to use the requested model.",
    404: "The API route or model was not found. Check the API address and the service's exact model name.",
    429: "The service is rate limited or has insufficient quota. Check your account and try again later.",
  };
  return [
    t(error.message),
    hints[error.status] ? t(hints[error.status]) : "",
    error.detail,
  ]
    .filter(Boolean)
    .join("\n");
}

async function modelFailure(
  response: Response,
  key: string,
): Promise<ModelRequestError> {
  let detail = "";
  try {
    const json = await response.json();
    const message =
      json?.error?.message ??
      json?.message ??
      (typeof json?.error === "string" ? json.error : "");
    if (typeof message === "string") detail = message;
  } catch {
    /* HTML error pages and empty responses should not obscure the HTTP status. */
  }
  if (key) detail = detail.split(key).join("[redacted]");
  detail = detail
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/sk-[\w-]+/g, "[redacted]")
    .slice(0, 350);
  return new ModelRequestError(response.status, detail);
}

export async function generate(
  config: AIConfig,
  prompt: string,
  doc: Document,
  selection: string[],
  signal: AbortSignal,
): Promise<Command[]> {
  const endpoint = chatCompletionsUrl(config.baseUrl);
  const key = config.key.trim();
  const instruction = `You edit a BaizeFig design document. Return JSON only: {"commands":[...]}. Allowed command types: create (nodes array with full valid node fields), update (ids, patch), delete (ids), layout (id, direction horizontal/vertical/none, gap, padding). Preserve existing IDs. New nodes must have unique IDs and use existing pageId. Colors must be hex or none. All nodes need id,pageId,parentId,type,name,x,y,width,height,rotation,fill,stroke,strokeWidth,radius,opacity,visible,locked,text,fontSize,fontFamily,fontWeight,textAlign,lineHeight. Never include code, scripts, credentials or external images. Supported types: frame,rectangle,ellipse,line,text,polygon,star,path,group. Perform only the requested edits. ${config.system}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({
      model: config.model.trim(),
      messages: [
        { role: "system", content: instruction },
        {
          role: "user",
          content: JSON.stringify({
            request: prompt,
            selection,
            document: doc,
          }),
        },
      ],
      temperature: 0.2,
    }),
    signal,
  });
  if (!response.ok) throw await modelFailure(response, key);
  const json = await response.json();
  const raw = json.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw Error("Model returned no content");
  const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  if (!Array.isArray(parsed.commands) || parsed.commands.length > 100)
    throw Error("Invalid AI command batch");
  let copy = doc;
  for (const command of parsed.commands) {
    if (!["create", "update", "delete", "layout"].includes(command.type))
      throw Error("Unsupported AI command");
    copy = execute(copy, command).doc;
  }
  return parsed.commands;
}
