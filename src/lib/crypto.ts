import { supabase } from "@/integrations/supabase/client";

/**
 * Passwords for QR pages are hashed and verified server-side (bcrypt).
 * The browser never computes or compares password hashes.
 */

export const setQRPassword = async (
  pageType: "profile" | "business",
  pageId: string,
  password: string | null
): Promise<void> => {
  const { error } = await supabase.rpc("set_qr_password", {
    p_page_type: pageType,
    p_page_id: pageId,
    p_password: password && password.trim() ? password.trim() : null,
  } as any);

  if (error) throw error;
};

export const verifyQRPassword = async (
  publicId: string,
  password: string
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("verify_qr_password", {
    qr_public_id: publicId,
    password,
  } as any);

  if (error) throw error;
  return data === true;
};
