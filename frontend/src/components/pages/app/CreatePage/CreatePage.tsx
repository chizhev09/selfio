// Экран «Создать»: карточки-действия, карусель из двух колец и три модальных потока.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserTokenBalance } from '../../../../hooks/useUserTokenBalance'
import { CreateOwnTemplateModal } from './modals/CreateOwnTemplateModal'
import { CreatePromptModal } from './modals/CreatePromptModal'
import { CreateQuickRandomModal } from './modals/CreateQuickRandomModal'
import { CreatePageActionGrid } from './components/CreatePageActionGrid'
import { CreatePageArcCarousel } from './components/CreatePageArcCarousel'
import { CreatePageIntro } from './components/CreatePageIntro'
import { getCreateCarouselPhotoUrls } from './createCarouselMedia'
import { useCreatePage } from './hooks/useCreatePage'
import './AppCreateProfilePage.css'

/** Собирает страницу «Создать» из секций и модалок. */
function CreatePage() {
  const p = useCreatePage()
  const navigate = useNavigate()
  const { balance: userTokenBalance, refetch: refetchUserTokenBalance } = useUserTokenBalance()
  const carouselUrls = useMemo(() => getCreateCarouselPhotoUrls(), [])

  /** Закрывает модалки «Создать» и открывает профиль с пополнением. */
  function handleNavigateTopUpFromCreate() {
    p.setIsQuickRandomModalOpen(false)
    p.handleClosePromptModal()
    p.handleCloseOwnTemplateModal()
    navigate('/app/profile', { state: { openTopUp: true } })
  }

  return (
    <div className="create-page">
      <CreatePageIntro />
      <CreatePageActionGrid
        onCreateWithPrompt={p.handleCreateWithPrompt}
        onChooseTemplate={p.handleChooseTemplate}
        onByMyTemplate={p.handleByMyTemplate}
        onQuickGenerate={p.handleQuickGenerate}
        onFromGallery={p.handleFromGallery}
      />
      <CreatePageArcCarousel carouselUrls={carouselUrls} />

      <CreateQuickRandomModal
        isOpen={p.isQuickRandomModalOpen}
        userTokenBalance={userTokenBalance}
        refreshBalance={refetchUserTokenBalance}
        onRequestTopUp={handleNavigateTopUpFromCreate}
        onClose={() => p.setIsQuickRandomModalOpen(false)}
      />

      <CreatePromptModal
        isOpen={p.isPromptModalOpen}
        quality={p.promptFlowQuality}
        aspectRatio={p.promptFlowAspect}
        userTokenBalance={userTokenBalance}
        refreshBalance={refetchUserTokenBalance}
        onQualityChange={p.setPromptFlowQuality}
        onAspectRatioChange={p.setPromptFlowAspect}
        selectedPhotoPreviewUrl={p.promptFlowPhotoPreview}
        onPhotoSelect={p.handlePromptFlowPhotoSelect}
        prompt={p.promptFlowText}
        onPromptChange={p.setPromptFlowText}
        canSubmit={Boolean(p.promptFlowPhotoFile && p.promptFlowText.trim())}
        isSubmitting={p.promptFlowSubmitting}
        onClose={p.handleClosePromptModal}
        onSubmit={() => void p.handleSubmitPromptFlow()}
      />

      <CreateOwnTemplateModal
        isOpen={p.isOwnTemplateModalOpen}
        quality={p.ownTemplateQuality}
        aspectRatio={p.ownTemplateAspect}
        userTokenBalance={userTokenBalance}
        refreshBalance={refetchUserTokenBalance}
        onQualityChange={p.setOwnTemplateQuality}
        onAspectRatioChange={p.setOwnTemplateAspect}
        selectedPhotoPreviewUrl={p.ownTemplatePhotoPreview}
        onPhotoSelect={p.handleOwnTemplatePhotoSelect}
        selectedTemplatePreviewUrl={p.ownTemplateRefPreview}
        onTemplateSelect={p.handleOwnTemplateRefSelect}
        prompt={p.ownTemplatePrompt}
        onPromptChange={p.setOwnTemplatePrompt}
        canSubmit={Boolean(p.ownTemplatePhotoFile && p.ownTemplateRefFile)}
        isSubmitting={p.ownTemplateSubmitting}
        onClose={p.handleCloseOwnTemplateModal}
        onSubmit={() => void p.handleSubmitOwnTemplate()}
      />
    </div>
  )
}

export default CreatePage
