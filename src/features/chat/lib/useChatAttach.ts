import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { uploadToStorage } from '../../../shared/lib/storage'
import { loadVacancies } from '../../vacancies/model/vacancyThunks'
import { formatSalary } from '../../vacancies/lib/labels'
import type { Vacancy } from '../../vacancies/model/types'
import type { ChatAttach } from '../model/types'

export const CHAT_DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,.rar,.7z'
const MEDIA_ACCEPT = 'image/*,video/*'

/**
 * Логика вложений в чате (общая для большого и мини-чата): загрузка фото/видео/документа
 * в Storage и отправка как сообщения-вложения, а для компании — прикрепление своей вакансии.
 * `send(text, attach)` — отправка из конкретного чата (prop-колбэк / dispatch).
 */
export function useChatAttach(send: (text: string, attach: ChatAttach) => void) {
  const dispatch = useAppDispatch()
  const isCompany = useAppSelector((s) => s.account.type === 'company')
  const myId = useAppSelector((s) => s.auth.user?.id)
  const vacanciesLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const vacancies = useAppSelector((s) => s.vacanciesList.items).filter(
    (v) => v.companyId && v.companyId === myId,
  )

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  // Режим меню-«булавки»: основной список или выбор вакансии.
  const [attachMode, setAttachMode] = useState<'main' | 'vacancy'>('main')

  // Подгружаем вакансии компании (нужны для прикрепления), если ещё не загружены.
  useEffect(() => {
    if (isCompany && !vacanciesLoaded) void dispatch(loadVacancies())
  }, [isCompany, vacanciesLoaded, dispatch])

  function pickPhoto() {
    if (!fileRef.current) return
    fileRef.current.accept = MEDIA_ACCEPT
    fileRef.current.click()
  }
  function pickDoc() {
    if (!fileRef.current) return
    fileRef.current.accept = CHAT_DOC_ACCEPT
    fileRef.current.click()
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToStorage('chat', file)
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      send('', {
        kind: isImage ? 'photo' : isVideo ? 'video' : 'file',
        url,
        mime: file.type,
        title: file.name,
      })
    } catch {
      /* тихо игнорируем — превью пропадёт, пользователь повторит */
    } finally {
      setUploading(false)
    }
  }

  function sendVacancy(v: Vacancy) {
    send('', {
      kind: 'vacancy',
      vacancyId: v.id,
      title: v.title,
      salary: formatSalary(v.salaryFrom, v.salaryTo, v.currency),
      city: v.city,
    })
    setAttachMode('main')
  }

  return {
    isCompany,
    vacancies,
    fileRef,
    uploading,
    attachMode,
    setAttachMode,
    pickPhoto,
    pickDoc,
    onFileChange,
    sendVacancy,
  }
}
