import { useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Upload as UploadIcon } from "lucide-react";
import { useMediaPresignedUploadRequestPresignedUpload, useMediaRegisterRegisterMedia } from "@/openapi/media/media";
import {
  useListSurveyMedia,
  getListSurveyMediaQueryKey,
} from "@/openapi/survey-media/survey-media";
import { useActionsActionGroupExecuteAction, useActionsActionGroupObjectIdExecuteObjectAction } from "@/openapi/actions/actions";

interface Props {
  surveyId: string;
  fieldId: string;
  label: string;
  required?: boolean;
}

/**
 * Photo capture for survey form fields. Drops files via the presigned-S3
 * upload flow, then attaches each Media to the survey via SurveyMedia.
 *
 * The form_response JSON copies the media IDs into the survey response for
 * fast reads; the SurveyMedia association table is the source of truth.
 */
export function PhotoField({ surveyId, fieldId, label, required }: Props) {
  const queryClient = useQueryClient();
  const listKey = getListSurveyMediaQueryKey({
    filters: [
      { type: "text", column: "survey_id", operation: "equals", value: surveyId },
      { type: "text", column: "field_id", operation: "equals", value: fieldId },
    ],
    limit: 50,
    offset: 0,
  });

  const { data } = useListSurveyMedia({
    filters: [
      { type: "text", column: "survey_id", operation: "equals", value: surveyId },
      { type: "text", column: "field_id", operation: "equals", value: fieldId },
    ],
    limit: 50,
    offset: 0,
  });

  const items = data?.items ?? [];

  const { mutateAsync: presign } = useMediaPresignedUploadRequestPresignedUpload();
  const { mutateAsync: register } = useMediaRegisterRegisterMedia();
  const { mutateAsync: attach } = useActionsActionGroupExecuteAction();
  const { mutateAsync: detach } = useActionsActionGroupObjectIdExecuteObjectAction();

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        try {
          const presigned = await presign({
            data: { file_name: file.name, content_type: file.type, file_size: file.size },
          });
          const putResp = await fetch(presigned.upload_url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          if (!putResp.ok) throw new Error(`Upload failed: HTTP ${putResp.status}`);

          const media = await register({
            data: {
              file_key: presigned.file_key,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
            },
          });

          await attach({
            actionGroup: "survey_media_actions",
            data: {
              action: "survey_media_actions__attach",
              data: {
                survey_id: surveyId,
                media_id: media.id,
                field_id: fieldId,
                caption: null,
                sort_order: items.length,
              },
            },
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        }
      }
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
    [attach, fieldId, items.length, listKey, presign, queryClient, register, surveyId],
  );

  const onRemove = useCallback(
    async (id: string) => {
      try {
        await detach({
          actionGroup: "survey_media_actions",
          objectId: id,
          data: { action: "survey_media_actions__detach", data: {} },
        });
        await queryClient.invalidateQueries({ queryKey: listKey });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Remove failed");
      }
    },
    [detach, listKey, queryClient],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <Card key={item.id} className="relative overflow-hidden">
            <CardContent className="p-0">
              <img
                src={item.thumbnail_url ?? item.view_url}
                alt={item.caption ?? item.file_name}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="absolute right-1 top-1 rounded-md bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-xs text-muted-foreground hover:bg-muted/30">
          <UploadIcon className="mb-1 h-4 w-4" />
          Add photo
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" disabled>
          {items.length} photo{items.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
