export {};
declare global {
  interface Window {
    baizefigDesktop?: {
      onOpenFile(
        callback: (file: {
          name: string;
          content?: string;
          error?: string;
        }) => Promise<void>,
      ): () => void;
      onSave(callback: () => Promise<boolean>): () => void;
      status(): Promise<{
        installed: boolean;
        running: boolean;
        endpoint: string;
        pairingToken: string;
        config: string;
      }>;
      manage(): Promise<void>;
      mcp(action: "install" | "start" | "stop" | "uninstall"): Promise<unknown>;
      client(action: "install" | "remove"): Promise<unknown>;
      copyConfig(): Promise<void>;
      update(): Promise<void>;
    };
  }
}
