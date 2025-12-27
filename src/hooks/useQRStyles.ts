import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { QRStyleConfig } from '@/lib/qr-styles';
import { defaultQRStyle } from '@/lib/qr-styles';

interface SavedQRStyle {
  id: string;
  name: string;
  is_default: boolean;
  config: QRStyleConfig;
  created_at: string;
  updated_at: string;
}

export function useQRStyles() {
  const { user } = useAuth();
  const [styles, setStyles] = useState<SavedQRStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultStyle, setDefaultStyle] = useState<QRStyleConfig>(defaultQRStyle);

  const fetchStyles = useCallback(async () => {
    if (!user) {
      setStyles([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('qr_styles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedStyles = (data || []).map((style: any) => ({
        ...style,
        config: style.config as QRStyleConfig,
      }));

      setStyles(parsedStyles);

      // Find and set default style
      const defaultStyleData = parsedStyles.find(s => s.is_default);
      if (defaultStyleData) {
        setDefaultStyle({ ...defaultQRStyle, ...defaultStyleData.config });
      }
    } catch (error) {
      console.error('Failed to fetch QR styles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const saveStyle = async (name: string, config: QRStyleConfig): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save styles');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('qr_styles')
        .insert({
          user_id: user.id,
          name,
          config: config as any,
          is_default: styles.length === 0, // Make first style the default
        })
        .select()
        .single();

      if (error) throw error;

      const newStyle = {
        ...data,
        config: data.config as unknown as QRStyleConfig,
      };

      setStyles(prev => [newStyle, ...prev]);
      toast.success(`Style "${name}" saved!`);
      return data.id;
    } catch (error) {
      console.error('Failed to save style:', error);
      toast.error('Failed to save style');
      return null;
    }
  };

  const updateStyle = async (id: string, updates: Partial<{ name: string; config: QRStyleConfig }>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('qr_styles')
        .update({
          ...updates,
          config: updates.config as any,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setStyles(prev =>
        prev.map(s => (s.id === id ? { ...s, ...updates } : s))
      );
      toast.success('Style updated!');
      return true;
    } catch (error) {
      console.error('Failed to update style:', error);
      toast.error('Failed to update style');
      return false;
    }
  };

  const deleteStyle = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('qr_styles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setStyles(prev => prev.filter(s => s.id !== id));
      toast.success('Style deleted!');
      return true;
    } catch (error) {
      console.error('Failed to delete style:', error);
      toast.error('Failed to delete style');
      return false;
    }
  };

  const setAsDefault = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // First, remove default from all styles
      await supabase
        .from('qr_styles')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the new default
      const { error } = await supabase
        .from('qr_styles')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setStyles(prev =>
        prev.map(s => ({ ...s, is_default: s.id === id }))
      );

      const newDefault = styles.find(s => s.id === id);
      if (newDefault) {
        setDefaultStyle({ ...defaultQRStyle, ...newDefault.config });
      }

      toast.success('Default style updated!');
      return true;
    } catch (error) {
      console.error('Failed to set default style:', error);
      toast.error('Failed to set default style');
      return false;
    }
  };

  const getStyleById = (id: string): SavedQRStyle | undefined => {
    return styles.find(s => s.id === id);
  };

  return {
    styles,
    isLoading,
    defaultStyle,
    saveStyle,
    updateStyle,
    deleteStyle,
    setAsDefault,
    getStyleById,
    refreshStyles: fetchStyles,
  };
}
