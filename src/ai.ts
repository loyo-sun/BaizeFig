import { type Command, type Document, execute } from "./core";
export interface AIConfig {
  baseUrl: string;
  model: string;
  key: string;
  system: string;
}
export async function generate(
  config: AIConfig,
  prompt: string,
  doc: Document,
  selection: string[],
  signal: AbortSignal,
): Promise<Command[]> {
  const url = new URL(config.baseUrl);
  if (!["https:", "http:"].includes(url.protocol))
    throw Error("Invalid API URL");
  const instruction = `You edit a BaizeFig design document. Return JSON only: {"commands":[...]}. Allowed command types: create (nodes array with full valid node fields), update (ids, patch), delete (ids), layout (id, direction horizontal/vertical/none, gap, padding). Preserve existing IDs. New nodes must have unique IDs and use existing pageId. Colors must be hex or none. All nodes need id,pageId,parentId,type,name,x,y,width,height,rotation,fill,stroke,strokeWidth,radius,opacity,visible,locked,text,fontSize,fontFamily,fontWeight,textAlign,lineHeight. Never include code, scripts, credentials or external images. Supported types: frame,rectangle,ellipse,line,text,polygon,star,path,group. Perform only the requested edits. ${config.system}`;
  const response = await fetch(
    config.baseUrl.replace(/\/$/, "") + "/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
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
    },
  );
  if (!response.ok) throw Error(`Model request failed (${response.status})`);
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
