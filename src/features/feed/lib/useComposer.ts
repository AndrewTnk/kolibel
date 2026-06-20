import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { getDisplayName } from '../../auth/lib/displayName'
import { createPost } from '../model/feedThunks'
import type { FeedContent } from '../model/types'
import { formatSalary } from '../../vacancies/lib/labels'
import type { Vacancy } from '../../vacancies/model/types'
import { uploadToStorage } from '../../../shared/lib/storage'

// url — локальный blob: только для превью; file заливается в Storage при публикации.
export type DraftMedia = { kind: 'image' | 'video' | 'document'; url: string; name: string; file: File }

// Максимум фотографий на пост (для гармоничной сетки-коллажа).
export const MAX_PHOTOS = 3

export const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,.rar,.7z'

/**
 * Вся логика композера поста (текст/медиа/вложения/вакансия/публикация) — единый источник
 * для десктопного инлайн-`PostComposer` и мобильного модального `MobilePostComposer`.
 * `onPublished` вызывается после успешной публикации (например, закрыть модалку).
 */
export function useComposer(onPublished?: () => void) {
  const dispatch = useAppDispatch()
  const authorName = getDisplayName(useAppSelector((s) => s.auth.user))
  const isCompany = useAppSelector((s) => s.account.type === 'company')
  const company = useAppSelector((s) => s.company.profile)
  const resume = useAppSelector((s) => s.profile.resume)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const vacancies = useAppSelector((s) => s.vacanciesList.items).filter(
    (v) => v.companyId && v.companyId === myId,
  )

  const [postText, setPostText] = useState('')
  const [media, setMedia] = useState<DraftMedia[]>([])
  const [publishing, setPublishing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [vacancy, setVacancy] = useState<Vacancy | null>(null)
  // Меню-«булавка»: режим 'main' (Фото/Видео/Документ/Вакансия) или 'vacancy' (выбор вакансии).
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachMode, setAttachMode] = useState<'main' | 'vacancy'>('main')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const attachMenuRef = useRef<HTMLDivElement | null>(null)

  // Меню вложений закрывается по клику вне него и по Escape.
  useEffect(() => {
    if (!attachOpen) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (attachMenuRef.current && !attachMenuRef.current.contains(t)) closeAttach()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAttach()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [attachOpen])

  function closeAttach() {
    setAttachOpen(false)
    setAttachMode('main')
  }

  /** Открыть файловый диалог с нужным фильтром формата. */
  function pickFiles(accept: string) {
    if (!fileRef.current) return
    fileRef.current.accept = accept
    fileRef.current.click()
  }

  function clearMedia() {
    setMedia((prev) => {
      prev.forEach((m) => URL.revokeObjectURL(m.url))
      return []
    })
  }

  /** Удалить одно вложение (по blob-url) — крестик на превью. */
  function removeMedia(url: string) {
    setMedia((prev) => {
      const target = prev.find((m) => m.url === url)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((m) => m.url !== url)
    })
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    let skippedPhotos = false
    setMedia((prev) => {
      const next = [...prev]
      let imageCount = next.filter((m) => m.kind === 'image').length
      for (const f of files) {
        const kind = f.type.startsWith('video/')
          ? 'video'
          : f.type.startsWith('image/')
            ? 'image'
            : 'document'
        // Максимум 3 фото на пост — лишние игнорируем.
        if (kind === 'image' && imageCount >= MAX_PHOTOS) {
          skippedPhotos = true
          continue
        }
        if (kind === 'image') imageCount++
        next.push({ kind, url: URL.createObjectURL(f), name: f.name, file: f })
      }
      return next
    })
    setUploadError(skippedPhotos ? `Можно прикрепить не более ${MAX_PHOTOS} фото` : null)
    e.currentTarget.value = ''
  }

  async function publish() {
    setUploadError(null)
    setPublishing(true)
    try {
      const content: FeedContent[] = []
      const t = postText.trim()
      if (t) content.push({ kind: 'text', text: t })
      // Заливаем файлы в Storage и подставляем публичные URL (вместо blob:, который теряется).
      for (const m of media) {
        const url = await uploadToStorage('posts', m.file)
        if (m.kind === 'image') content.push({ kind: 'image', url, alt: m.name })
        else if (m.kind === 'video') content.push({ kind: 'video', url, title: m.name })
        else content.push({ kind: 'document', url, name: m.name })
      }
      if (vacancy) {
        content.push({
          kind: 'vacancy',
          vacancyId: vacancy.id,
          title: vacancy.title,
          salary: formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.currency),
          city: vacancy.city,
        })
      }
      const res = await dispatch(
        createPost({
          authorName: isCompany ? company.name : authorName,
          authorAvatar: isCompany ? company.avatar || company.logo : resume.avatar,
          authorKind: isCompany ? 'company' : 'user',
          content,
        }),
      )
      if (createPost.fulfilled.match(res)) {
        setPostText('')
        setVacancy(null)
        clearMedia()
        onPublished?.()
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Не удалось загрузить вложения')
    } finally {
      setPublishing(false)
    }
  }

  const canPublish = !!postText.trim() || !!media.length || !!vacancy

  return {
    authorName,
    isCompany,
    company,
    resume,
    vacancies,
    postText,
    setPostText,
    media,
    vacancy,
    setVacancy,
    publishing,
    uploadError,
    canPublish,
    attachOpen,
    setAttachOpen,
    attachMode,
    setAttachMode,
    fileRef,
    attachMenuRef,
    closeAttach,
    pickFiles,
    removeMedia,
    onFileChange,
    publish,
  }
}
