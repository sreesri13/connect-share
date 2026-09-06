import { supabase } from "@/integrations/supabase/client";

export type QRRole = "owner" | "editor" | "viewer" | null;

export interface QRAccessInfo {
  exists: boolean;
  id?: string;
  title?: string;
  public_id?: string;
  owner_id?: string;
  owner_name?: string;
  public_view?: boolean;
  allow_requests?: boolean;
  user_role?: QRRole;
  has_pending_request?: boolean;
  pending_request_role?: "viewer" | "editor" | null;
}

export const fetchQRAccessInfo = async (
  identifier: string,
  isBusiness: boolean = false
): Promise<QRAccessInfo> => {
  try {
    const { data, error } = await (supabase.rpc as any)("get_qr_access_info", {
      p_identifier: identifier,
      p_is_business: isBusiness,
    });
    if (error) throw error;
    return (data as unknown as QRAccessInfo) || { exists: false };
  } catch (err) {
    console.error("Failed to fetch QR access info via RPC:", err);
    // Fallback: simple query
    const table = isBusiness ? "qr_business_pages" : "qr_pages";
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    let query = supabase.from(table).select("*");
    if (isUuid) {
      query = query.or(`public_id.eq.${identifier},id.eq.${identifier}`);
    } else {
      query = query.eq("public_id", identifier);
    }
    const { data: page } = await query.maybeSingle();
    if (!page) return { exists: false };

    const { data: { session } } = await supabase.auth.getSession();
    const isOwner = session?.user?.id === (page as any).user_id;

    return {
      exists: true,
      id: (page as any).id,
      title: isBusiness ? (page as any).business_name : (page as any).title,
      public_id: (page as any).public_id,
      owner_id: (page as any).user_id,
      owner_name: "Owner",
      public_view: (page as any).public_view ?? true,
      allow_requests: (page as any).allow_requests ?? false,
      user_role: isOwner ? "owner" : null,
      has_pending_request: false,
      pending_request_role: null,
    };
  }
};

export const checkQRPermission = async (
  qrId: string,
  qrType: "profile" | "business",
  userEmail?: string | null
): Promise<{ role: QRRole; publicView: boolean; allowRequests: boolean }> => {
  const table = qrType === "profile" ? "qr_pages" : "qr_business_pages";
  const fkColumn = qrType === "profile" ? "qr_page_id" : "qr_business_page_id";

  const { data: qrData } = await supabase
    .from(table)
    .select("user_id, public_view, allow_requests")
    .eq("id", qrId)
    .single();

  if (!qrData) return { role: null, publicView: true, allowRequests: false };

  const publicView = qrData.public_view ?? true;
  const allowRequests = qrData.allow_requests ?? false;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id === qrData.user_id) {
    return { role: "owner", publicView, allowRequests };
  }

  const emailToCheck = session?.user?.email || userEmail;
  if (emailToCheck) {
    const { data: perm } = await supabase
      .from("qr_permissions")
      .select("role")
      .eq(fkColumn, qrId)
      .eq("user_email", emailToCheck.toLowerCase())
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

export const approveAccessRequest = async (requestId: string, role: "viewer" | "editor") => {
  const { data, error } = await (supabase.rpc as any)("approve_qr_access_request", {
    p_request_id: requestId,
    p_role: role,
  });
  if (error) throw error;
  return data;
};

export const rejectAccessRequest = async (requestId: string) => {
  const { data, error } = await (supabase.rpc as any)("reject_qr_access_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
};

export const revokePermission = async (permissionId: string) => {
  const { data, error } = await (supabase.rpc as any)("revoke_qr_permission", {
    p_permission_id: permissionId,
  });
  if (error) throw error;
  return data;
};

export const addDirectPermission = async (
  pageId: string,
  isBusiness: boolean,
  email: string,
  role: "viewer" | "editor"
) => {
  const { data, error } = await (supabase.rpc as any)("add_direct_qr_permission", {
    p_page_id: pageId,
    p_is_business: isBusiness,
    p_email: email,
    p_role: role,
  });
  if (error) throw error;
  return data;
};
