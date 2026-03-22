import { supabase } from "@/integrations/supabase/client";

export type QRRole = "owner" | "editor" | "viewer" | null;

export const checkQRPermission = async (
  qrId: string,
  qrType: "profile" | "business",
  userEmail: string | null | undefined
): Promise<{ role: QRRole; publicView: boolean; allowRequests: boolean }> => {
  const table = qrType === "profile" ? "qr_pages" : "qr_business_pages";
  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  // Fetch QR settings
  const { data: qrData } = await supabase
    .from(table)
    .select("user_id, public_view, allow_requests")
    .eq("id", qrId)
    .single();

  if (!qrData) return { role: null, publicView: true, allowRequests: false };

  const publicView = qrData.public_view ?? true;
  const allowRequests = qrData.allow_requests ?? false;

  // Check if current user is owner
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id === qrData.user_id) {
    return { role: "owner", publicView, allowRequests };
  }

  // Check email-based permission
  if (userEmail) {
    const { data: perm } = await supabase
      .from("qr_permissions")
      .select("role")
      .eq(fkColumn, qrId)
      .eq("user_email", userEmail.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (perm) {
      return { role: perm.role as QRRole, publicView, allowRequests };
    }
  }

  return { role: null, publicView, allowRequests };
};

export const getRequestCount = async (
  qrId: string,
  qrType: "profile" | "business"
): Promise<number> => {
  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";
  const { count } = await supabase
    .from("qr_access_requests")
    .select("*", { count: "exact", head: true })
    .eq(fkColumn, qrId)
    .eq("status", "pending");
  return count || 0;
};
