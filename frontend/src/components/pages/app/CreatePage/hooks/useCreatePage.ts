// Состояние модалок «Создать» и отправка задач генерации в библиотечный API.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CREATE_FLOW_MANIFEST_PLACEHOLDER,
  CREATE_FLOW_OWN_TEMPLATE_ID,
  CREATE_FLOW_PROMPT_TEMPLATE_ID,
  GEMINI_GENERATION_IMAGE_MODEL,
  libraryApi,
  NANO_BANANA_DEFAULT_SCENE_PROMPT,
} from '../../LibraryPage/services/libraryApi'
import type { OwnTemplateAspectRatio } from '../types/createPage.types'

/** Хук экрана «Создать»: три потока генерации и навигация в галерею/библиотеку. */
export function useCreatePage() {
  const navigate = useNavigate()

  const [isOwnTemplateModalOpen, setIsOwnTemplateModalOpen] = useState(false)
  const [ownTemplatePhotoFile, setOwnTemplatePhotoFile] = useState<File | null>(null)
  const [ownTemplatePhotoPreview, setOwnTemplatePhotoPreview] = useState<string | null>(null)
  const [ownTemplateQuality, setOwnTemplateQuality] = useState<'standard' | 'pro'>('standard')
  const [ownTemplateAspect, setOwnTemplateAspect] = useState<OwnTemplateAspectRatio>('9:16')
  const [ownTemplatePrompt, setOwnTemplatePrompt] = useState('')
  const [ownTemplateSubmitting, setOwnTemplateSubmitting] = useState(false)

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptFlowPhotoFile, setPromptFlowPhotoFile] = useState<File | null>(null)
  const [promptFlowPhotoPreview, setPromptFlowPhotoPreview] = useState<string | null>(null)
  const [promptFlowText, setPromptFlowText] = useState('')
  const [promptFlowQuality, setPromptFlowQuality] = useState<'standard' | 'pro'>('standard')
  const [promptFlowAspect, setPromptFlowAspect] = useState<OwnTemplateAspectRatio>('9:16')
  const [promptFlowSubmitting, setPromptFlowSubmitting] = useState(false)

  const [isQuickRandomModalOpen, setIsQuickRandomModalOpen] = useState(false)

  useEffect(() => {
    /** Снимает blob-URL превью фото «свой сценарий» при смене или размонтировании. */
    return () => {
      if (ownTemplatePhotoPreview) {
        URL.revokeObjectURL(ownTemplatePhotoPreview)
      }
    }
  }, [ownTemplatePhotoPreview])

  useEffect(() => {
    /** Снимает blob-URL превью фото «по промту» при смене или размонтировании. */
    return () => {
      if (promptFlowPhotoPreview) {
        URL.revokeObjectURL(promptFlowPhotoPreview)
      }
    }
  }, [promptFlowPhotoPreview])

  /** Сохраняет фото для модалки «по промту». */
  const handlePromptFlowPhotoSelect = (file: File | null) => {
    if (promptFlowPhotoPreview) {
      URL.revokeObjectURL(promptFlowPhotoPreview)
    }
    if (!file) {
      setPromptFlowPhotoFile(null)
      setPromptFlowPhotoPreview(null)
      return
    }
    setPromptFlowPhotoFile(file)
    setPromptFlowPhotoPreview(URL.createObjectURL(file))
  }

  /** Закрывает модалку промта и очищает поля. */
  const handleClosePromptModal = () => {
    handlePromptFlowPhotoSelect(null)
    setPromptFlowText('')
    setIsPromptModalOpen(false)
  }

  /** Открывает модалку генерации по текстовому описанию. */
  const handleCreateWithPrompt = () => {
    setIsPromptModalOpen(true)
  }

  /** Загружает фото и ставит задачу Nano Banana по тексту пользователя. */
  const handleSubmitPromptFlow = async () => {
    if (!promptFlowPhotoFile || !promptFlowText.trim()) {
      return
    }
    setPromptFlowSubmitting(true)
    try {
      const userKey = await libraryApi.uploadUserPhotoFile(promptFlowPhotoFile)
      const generationJob = await libraryApi.generateFromTemplate({
        quality: promptFlowQuality,
        model: GEMINI_GENERATION_IMAGE_MODEL,
        aspect_ratio: promptFlowAspect,
        template_id: CREATE_FLOW_PROMPT_TEMPLATE_ID,
        manifest_path: CREATE_FLOW_MANIFEST_PLACEHOLDER,
        selected_prompt: promptFlowText.trim(),
        user_photo_object_key: userKey,
      })
      navigate('/app/photos', {
        state: { pendingGeneration: { requestId: generationJob.request_id } },
      })
      handleClosePromptModal()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Не удалось отправить генерацию')
    } finally {
      setPromptFlowSubmitting(false)
    }
  }

  /** Открывает экран библиотеки шаблонов. */
  const handleChooseTemplate = () => {
    navigate('/app/library')
  }

  /** Сохраняет фото пользователя для модалки «свой сценарий» и обновляет превью. */
  const handleOwnTemplatePhotoSelect = (file: File | null) => {
    if (ownTemplatePhotoPreview) {
      URL.revokeObjectURL(ownTemplatePhotoPreview)
    }
    if (!file) {
      setOwnTemplatePhotoFile(null)
      setOwnTemplatePhotoPreview(null)
      return
    }
    setOwnTemplatePhotoFile(file)
    setOwnTemplatePhotoPreview(URL.createObjectURL(file))
  }

  /** Закрывает модалку и сбрасывает выбранные файлы и промт. */
  const handleCloseOwnTemplateModal = () => {
    handleOwnTemplatePhotoSelect(null)
    setOwnTemplatePrompt('')
    setIsOwnTemplateModalOpen(false)
  }

  /** Открывает модалку генерации по своему тексту и одному фото. */
  const handleByMyTemplate = () => {
    setIsOwnTemplateModalOpen(true)
  }

  /** Загружает фото пользователя и ставит задачу с текстом сценария (без второго изображения). */
  const handleSubmitOwnTemplate = async () => {
    if (!ownTemplatePhotoFile) {
      return
    }
    setOwnTemplateSubmitting(true)
    try {
      const userKey = await libraryApi.uploadUserPhotoFile(ownTemplatePhotoFile)
      const promptText = ownTemplatePrompt.trim() || NANO_BANANA_DEFAULT_SCENE_PROMPT
      const generationJob = await libraryApi.generateFromTemplate({
        quality: ownTemplateQuality,
        model: GEMINI_GENERATION_IMAGE_MODEL,
        aspect_ratio: ownTemplateAspect,
        template_id: CREATE_FLOW_OWN_TEMPLATE_ID,
        manifest_path: CREATE_FLOW_MANIFEST_PLACEHOLDER,
        selected_prompt: promptText,
        user_photo_object_key: userKey,
      })
      navigate('/app/photos', {
        state: { pendingGeneration: { requestId: generationJob.request_id } },
      })
      handleCloseOwnTemplateModal()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Не удалось отправить генерацию')
    } finally {
      setOwnTemplateSubmitting(false)
    }
  }

  /** Открывает модалку быстрой генерации со случайным шаблоном из библиотеки. */
  const handleQuickGenerate = () => {
    setIsQuickRandomModalOpen(true)
  }

  /** Переходит к разделу «Мои фото». */
  const handleFromGallery = () => {
    navigate('/app/photos')
  }

  return {
    isOwnTemplateModalOpen,
    setIsOwnTemplateModalOpen,
    ownTemplatePhotoFile,
    ownTemplatePhotoPreview,
    ownTemplateQuality,
    setOwnTemplateQuality,
    ownTemplateAspect,
    setOwnTemplateAspect,
    ownTemplatePrompt,
    setOwnTemplatePrompt,
    ownTemplateSubmitting,
    isPromptModalOpen,
    promptFlowPhotoFile,
    promptFlowPhotoPreview,
    promptFlowText,
    setPromptFlowText,
    promptFlowQuality,
    setPromptFlowQuality,
    promptFlowAspect,
    setPromptFlowAspect,
    promptFlowSubmitting,
    isQuickRandomModalOpen,
    setIsQuickRandomModalOpen,
    handlePromptFlowPhotoSelect,
    handleClosePromptModal,
    handleCreateWithPrompt,
    handleSubmitPromptFlow,
    handleChooseTemplate,
    handleOwnTemplatePhotoSelect,
    handleCloseOwnTemplateModal,
    handleByMyTemplate,
    handleSubmitOwnTemplate,
    handleQuickGenerate,
    handleFromGallery,
  }
}
