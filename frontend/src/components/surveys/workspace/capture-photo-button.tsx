import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  mediaPresignedUploadRequestPresignedUpload,
  mediaRegisterRegisterMedia,
} from "@/openapi/media/media";
import { actionsActionGroupExecuteAction } from "@/openapi/actions/actions";

async function uploadFile(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

type Props = {
  surveyId: string;
  nodeId?: string | null;
  /** Camera mode: capture="environment" for rear camera, undefined for library. */
  mode?: "camera" | "library";
  label?: string;
  size?: "sm" | "xs";
  onUploaded?: () => Promise<unknown> | void;
};

export function CapturePhotoButton({
  surveyId,
  nodeId = null,
  mode = "library",
  label,
  size = "sm",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPending(true);
    try {
      for (const file of Array.from(files)) {
        const { upload_url, file_key } = await mediaPresignedUploadRequestPresignedUpload({
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || "application/octet-stream",
        });
        await uploadFile(upload_url, file);
        const media = await mediaRegisterRegisterMedia({
          file_key,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || "application/octet-stream",
        });
        await actionsActionGroupExecuteAction("survey_media_actions", {
          action: "survey_media_actions__attach",
          data: {
            survey_id: surveyId,
            media_id: media.id,
            node_id: nodeId,
            caption: null,
            sort_order: 0,
          },
        } as never);
      }
      await onUploaded?.();
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const displayLabel = label ?? (mode === "camera" ? "📷 Camera" : "🖼️ Upload");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={mode === "camera" ? "environment" : undefined}
        multiple={mode === "library"}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        className={size === "xs" ? "h-6 px-2 text-xs text-muted-foreground" : "text-xs"}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? "Uploading…" : displayLabel}
      </Button>
    </>
  );
}
