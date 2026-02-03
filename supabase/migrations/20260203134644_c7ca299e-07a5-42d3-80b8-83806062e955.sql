-- جدول مهام تحميل الصفحات بالخلفية
CREATE TABLE IF NOT EXISTS public.background_download_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID REFERENCES public.manga(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 10,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- فهرس للحصول على المهام المعلقة بالترتيب
CREATE INDEX IF NOT EXISTS idx_bg_queue_pending ON public.background_download_queue(status, priority DESC, created_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bg_queue_chapter ON public.background_download_queue(chapter_id);
CREATE INDEX IF NOT EXISTS idx_bg_queue_manga ON public.background_download_queue(manga_id);

-- تفعيل RLS
ALTER TABLE public.background_download_queue ENABLE ROW LEVEL SECURITY;

-- سياسة: المسؤولون فقط يمكنهم التعامل مع قائمة الانتظار
CREATE POLICY "Admins can manage download queue" ON public.background_download_queue
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- سياسة قراءة للمستخدمين المصادقين
CREATE POLICY "Users can view queue status" ON public.background_download_queue
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- تريجر لتحديث updated_at
CREATE TRIGGER update_bg_queue_updated_at
  BEFORE UPDATE ON public.background_download_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();