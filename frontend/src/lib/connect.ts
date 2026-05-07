import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { customInstance } from "@/openapi/custom-instance";

export interface ConnectAccountRequirements {
  currently_due: string[];
  eventually_due: string[];
  pending_verification: string[];
  future_requirements: Record<string, unknown>;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export interface ConnectAccountResponse {
  stripe_account_id: string;
}

export const connectRequirementsQueryKey = [
  "/organizations/me/connect/account/requirements",
] as const;

async function fetchConnectRequirements(
  signal?: AbortSignal,
): Promise<ConnectAccountRequirements | null> {
  try {
    return await customInstance<ConnectAccountRequirements>({
      url: "/organizations/me/connect/account/requirements",
      method: "GET",
      signal,
    });
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}

export function useConnectRequirements() {
  return useSuspenseQuery({
    queryKey: connectRequirementsQueryKey,
    queryFn: ({ signal }) => fetchConnectRequirements(signal),
  });
}

export function useCreateConnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customInstance<ConnectAccountResponse>({
        url: "/organizations/me/connect/account",
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectRequirementsQueryKey });
    },
  });
}

const REQUIREMENT_LABELS: Record<string, string> = {
  "external_account": "Bank account required",
  "individual.verification.document": "Identity document required",
  "individual.verification.additional_document": "Additional ID document required",
  "tos_acceptance.date": "Terms of service acceptance pending",
  "tos_acceptance.ip": "Terms of service acceptance pending",
  "business_profile.url": "Business website required",
  "business_profile.mcc": "Business category required",
};

export function describeRequirement(key: string): string {
  if (REQUIREMENT_LABELS[key]) return REQUIREMENT_LABELS[key];
  if (key.startsWith("individual.")) return "Identity verification pending";
  if (key.startsWith("company.")) return "Business details required";
  if (key.startsWith("business_profile.")) return "Business profile required";
  return key.replace(/[._]/g, " ");
}
